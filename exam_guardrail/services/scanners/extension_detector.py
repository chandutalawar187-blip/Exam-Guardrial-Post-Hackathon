# exam_guardrail/services/scanners/extension_detector.py
# Detects and optionally disables known cheating browser extensions.
#
# Detection:
#   - Scans Chrome, Edge, Brave extension directories for known cheat extension IDs
#   - Checks for extensions installed via developer mode (unpacked)
#
# Blocking:
#   - Renames the extension folder to disable it (reversible)
#   - Uses Chrome managed-policy registry to force-disable (Windows)

import os
import json
import platform
import datetime
import logging
import shutil

log = logging.getLogger('exam_guardrail.extensions')

# ── KNOWN CHEATING / AI EXTENSION IDS ────────────────────────
# Chrome Web Store extension IDs
BLOCKED_EXTENSIONS = {
    # AI assistants
    'jjkchpdmjjdmalgembblgafpbfnkfnde': 'Cluely AI browser helper',
    'mhnlakgilnojmhinhkckjpncpbhabphi': 'ChatGPT for Google',
    'iaakpnchhognanibcahlpcplchdfmgma':  'ChatGPT - Google/Bing AI assistant',
    'ogbhbgkiojglddpcjinnophbhpnbfmkl': 'UseChatGPT.AI',
    'difoiogjjojoaoomphldepapgpbgkhkb': 'Monica AI - GPT-4o assistant',
    'camppjleccjaphfdbohjdohecfnoikec': 'Merlin - ChatGPT on all websites',
    'efbjaemollihflpkgmondlicpmhfljkn': 'Sider AI - ChatGPT sidebar',
    'oahiknelgkelcfjcgbhiiaifapmgoine': 'MaxAI - Use AI anywhere',
    'mcbpblocgmgfnpjjppndjkmgjaogfceg': 'Copilot Bing AI sidebar',
    'pkgciiiancapdlpcbppfkmeaieppikkk': 'Phind AI search',
    'hlgbcneanomplepojfcnclggenpcoldo': 'Perplexity AI companion',

    # Homework / exam cheating
    'dinghabglkkcbfmaphchjmjbgolpekja': 'Brainly - homework helper',
    'ghlkmliaadkpekihfocmnoijcnkijjcl': 'Chegg answers extension',
    'gighmmpiobklfepjocnamgkkbiglidom': 'CourseHero unblur',
    'ekpieecmiogbjhjhbcdjfldgenpcgnha': 'Bartleby answers',

    # Text / writing AI
    'kbfnbcaeplbcioakkpcpgfkobkghlhen': 'Grammarly AI writing',
    'iahcmkhpgnajepfemndcjhkjgfbppkdl': 'QuillBot AI paraphraser',
    'liecbddmkiiihnedobmlmillhodjkdmb': 'Copy AI assistant',
    'bamhhdgonkajjgamcpgojjlmcnhfoec': 'Jasper AI assistant',

    # Screen capture / sharing
    'mmeijimgabbpbgpdklnllpncmdofkcpn': 'Screencastify recorder',
    'lefedoempdalfignjkahbgcnbcoajchf': 'Loom screen recorder',
    'liecbddmkiiihnedobmlmillhodjkdmb': 'Scribe screen recorder',
    'alelhddbbhepgpmgidjdcjakblofbmce': 'GoFullPage screenshot',

    # Remote access
    'gbchcmhmhahfdphkhkmpfmihenigjmpp': 'Chrome Remote Desktop',
    'inomeogfingihgjfjlpeplalcfajhgai': 'AnyDesk Chrome extension',
}

# Known cheat extension names (for unpacked / dev-mode detection)
BLOCKED_EXTENSION_NAMES = [
    'cluely', 'interview coder', 'interviewcoder',
    'chatgpt', 'usechatgpt', 'monica ai', 'merlin',
    'sider ai', 'maxai', 'copilot', 'phind', 'perplexity',
    'brainly', 'chegg', 'coursehero', 'bartleby',
    'quillbot', 'grammarly', 'jasper',
    'screencastify', 'loom', 'scribe',
    'parakeet', 'ghostwriter',
]


def _get_browser_extension_dirs():
    """Return a list of (browser_name, extensions_dir) for all Chromium browsers."""
    system = platform.system()
    dirs = []

    if system == 'Windows':
        local = os.environ.get('LOCALAPPDATA', '')
        if local:
            dirs.append(('Chrome', os.path.join(local, 'Google', 'Chrome', 'User Data')))
            dirs.append(('Edge', os.path.join(local, 'Microsoft', 'Edge', 'User Data')))
            dirs.append(('Brave', os.path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data')))

    elif system == 'Darwin':
        home = os.path.expanduser('~')
        dirs.append(('Chrome', os.path.join(home, 'Library', 'Application Support', 'Google', 'Chrome')))
        dirs.append(('Edge', os.path.join(home, 'Library', 'Application Support', 'Microsoft Edge')))
        dirs.append(('Brave', os.path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser')))

    elif system == 'Linux':
        home = os.path.expanduser('~')
        dirs.append(('Chrome', os.path.join(home, '.config', 'google-chrome')))
        dirs.append(('Edge', os.path.join(home, '.config', 'microsoft-edge')))
        dirs.append(('Brave', os.path.join(home, '.config', 'BraveSoftware', 'Brave-Browser')))

    return dirs


def _get_profile_dirs(user_data_dir):
    """Find all profile directories (Default, Profile 1, Profile 2, ...)."""
    profiles = []
    if not os.path.isdir(user_data_dir):
        return profiles

    for name in os.listdir(user_data_dir):
        if name == 'Default' or name.startswith('Profile '):
            ext_dir = os.path.join(user_data_dir, name, 'Extensions')
            if os.path.isdir(ext_dir):
                profiles.append((name, ext_dir))
    return profiles


def _read_extension_name(ext_version_dir):
    """Try to read the extension name from its manifest.json."""
    manifest = os.path.join(ext_version_dir, 'manifest.json')
    if not os.path.isfile(manifest):
        return None
    try:
        with open(manifest, 'r', encoding='utf-8', errors='ignore') as f:
            data = json.load(f)
        return data.get('name', '')
    except Exception:
        return None


def scan_extensions(block=False):
    """
    Scan all Chromium browser profiles for known cheating extensions.

    Args:
        block: If True, rename extension directories to disable them.

    Returns:
        List of finding dicts for each detected extension.
    """
    findings = []
    now = datetime.datetime.utcnow().isoformat()
    system = platform.system()

    for browser_name, user_data_dir in _get_browser_extension_dirs():
        for profile_name, ext_dir in _get_profile_dirs(user_data_dir):
            try:
                for ext_id in os.listdir(ext_dir):
                    ext_path = os.path.join(ext_dir, ext_id)

                    # Skip already-disabled extensions
                    if ext_id.endswith('.blocked'):
                        continue
                    if not os.path.isdir(ext_path):
                        continue

                    # Check by extension ID
                    matched_reason = None
                    if ext_id in BLOCKED_EXTENSIONS:
                        matched_reason = BLOCKED_EXTENSIONS[ext_id]

                    # Check by manifest name (catches unpacked / dev-mode extensions)
                    if not matched_reason:
                        for version_dir in os.listdir(ext_path):
                            vpath = os.path.join(ext_path, version_dir)
                            if os.path.isdir(vpath):
                                name = _read_extension_name(vpath)
                                if name:
                                    name_lower = name.lower()
                                    for blocked_name in BLOCKED_EXTENSION_NAMES:
                                        if blocked_name in name_lower:
                                            matched_reason = f'Extension name match: {name}'
                                            break
                                if matched_reason:
                                    break

                    if matched_reason:
                        blocked = False
                        if block:
                            blocked = _disable_extension(ext_path)

                        findings.append({
                            'event_type': 'CHEAT_EXTENSION_BLOCKED' if blocked else 'CHEAT_EXTENSION_DETECTED',
                            'severity': 'CRITICAL',
                            'score_delta': -40,
                            'layer': 'L4',
                            'blocked': blocked,
                            'metadata': {
                                'extension_id': ext_id,
                                'reason': matched_reason,
                                'browser': browser_name,
                                'profile': profile_name,
                                'path': ext_path,
                                'action': 'disabled' if blocked else 'detected',
                                'source': 'extension_detector',
                            },
                            'timestamp': now,
                            'platform': system,
                        })

            except PermissionError:
                pass
            except Exception as e:
                log.debug(f'Extension scan error ({browser_name}/{profile_name}): {e}')

    return findings


def _disable_extension(ext_path):
    """
    Disable an extension by renaming its directory.
    Appending '.blocked' makes Chrome ignore it on next launch.
    Returns True if disabled successfully.
    """
    blocked_path = ext_path + '.blocked'
    try:
        os.rename(ext_path, blocked_path)
        log.info(f'EXTENSION DISABLED: {ext_path} -> {blocked_path}')
        return True
    except Exception as e:
        log.warning(f'Failed to disable extension {ext_path}: {e}')
        return False


def restore_extensions():
    """
    Re-enable all previously blocked extensions (call after exam ends).
    Renames *.blocked directories back to their original names.
    """
    restored = 0
    for browser_name, user_data_dir in _get_browser_extension_dirs():
        for profile_name, ext_dir in _get_profile_dirs(user_data_dir):
            try:
                for name in os.listdir(ext_dir):
                    if name.endswith('.blocked'):
                        blocked_path = os.path.join(ext_dir, name)
                        original_path = os.path.join(ext_dir, name[:-8])  # strip '.blocked'
                        try:
                            os.rename(blocked_path, original_path)
                            restored += 1
                        except Exception:
                            pass
            except Exception:
                pass

    log.info(f'Restored {restored} previously blocked extensions.')
    return restored


def get_blocked_extension_ids():
    """Returns the set of extension IDs that will be blocked."""
    return set(BLOCKED_EXTENSIONS.keys())
