(function () {
    'use strict';

    // Rebrand title in WebUI
    document.title = 'Hoang2Ray';
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim() === 'Magic V2Ray') {
        h1.textContent = 'Hoang2Ray';
    }

    // Apply Hoang2Ray default presets once on first launch:
    // - networkMode = 2 (Mobile Data Only: 4G proxy, Wi-Fi direct)
    // - allowTether = true (Auto Hotspot proxy)
    // - mux = false (Low ping for gaming)
    // - mtu = 1400 (Optimal for 4G + WS)
    try {
        if (!localStorage.getItem('h2r_init_done') && typeof advSettings === 'object') {
            advSettings.networkMode = 2;
            advSettings.allowTether = true;
            advSettings.mux = false;
            advSettings.mtu = 1400;
            localStorage.setItem('h2r_init_done', '1');
            if (typeof writeFileB64 === 'function' && typeof SETTINGS_FILE !== 'undefined' && typeof utoa === 'function') {
                writeFileB64(SETTINGS_FILE, utoa(JSON.stringify(advSettings)));
            }
            const nmEl = document.getElementById('set-networkmode');
            if (nmEl) nmEl.value = '2';
            const mtuEl = document.getElementById('set-mtu');
            if (mtuEl) mtuEl.value = '1400';
            const muxEl = document.getElementById('set-mux');
            if (muxEl) muxEl.checked = false;
            const tetherEl = document.getElementById('set-allowtether');
            if (tetherEl) tetherEl.checked = true;
        }
    } catch (e) {}

    // Extend i18n dictionary
    if (typeof i18n !== 'undefined') {
        const extraEn = {
            quick_paste: 'Paste Clipboard',
            quick_update: 'Update Configs',
            quick_ping: 'Check Ping',
            quick_clear: 'Clear All',
            toast_no_sub_to_update: 'No subscription URL to update.',
            toast_updating_subs: 'Updating {count} subscription(s)...',
            toast_no_nodes_to_ping: 'No nodes available to ping.',
            toast_pinging_all: 'Checking ping for all nodes...',
            toast_already_empty: 'Configuration list is already empty.',
            confirm_clear_all: 'Delete all categories and configurations?',
            toast_cleared_all: 'All configurations cleared.'
        };
        const extraVi = {
            quick_paste: 'Dán Clipboard',
            quick_update: 'Cập nhật',
            quick_ping: 'Kiểm tra Ping',
            quick_clear: 'Xóa hết',
            toast_no_sub_to_update: 'Chưa có liên kết subscription để cập nhật.',
            toast_updating_subs: 'Đang cập nhật {count} subscription...',
            toast_no_nodes_to_ping: 'Chưa có node nào để kiểm tra ping.',
            toast_pinging_all: 'Đang kiểm tra ping tất cả node...',
            toast_already_empty: 'Danh sách cấu hình đang trống.',
            confirm_clear_all: 'Xóa toàn bộ danh mục và cấu hình hiện có?',
            toast_cleared_all: 'Đã xóa hết toàn bộ cấu hình.'
        };
        if (i18n.en) Object.assign(i18n.en, extraEn);
        if (i18n.vi) Object.assign(i18n.vi, extraVi);
    }

    // Auto-enable hourly auto-update for newly imported subscription categories
    if (typeof window.parseAndAppendNodes === 'function' && !window.__h2rWrappedParse) {
        window.__h2rWrappedParse = true;
        const _origParse = window.parseAndAppendNodes;
        window.parseAndAppendNodes = function (category, xrayConfigs, url) {
            const res = _origParse.apply(this, arguments);
            if (url && typeof profiles === 'object' && profiles[category] && profiles[category].autoupdate === undefined) {
                profiles[category].autoupdate = true;
                if (typeof saveProfiles === 'function') saveProfiles();
            }
            return res;
        };
    }

    window.quickReloadAllConfigs = async function () {
        if (typeof profiles !== 'object') return;
        const cats = Object.keys(profiles).filter(c => profiles[c] && profiles[c].url && /^https?:\/\//i.test(profiles[c].url));
        if (cats.length === 0) {
            if (typeof showToast === 'function') showToast(t('toast_no_sub_to_update'), 'info');
            return;
        }
        if (typeof showToast === 'function') showToast(t('toast_updating_subs', { count: cats.length }), 'info');
        if (typeof fetchSubscription === 'function') {
            await Promise.all(cats.map(c => fetchSubscription(c, profiles[c].url, true)));
        }
    };

    window.quickPingAllConfigs = async function () {
        if (typeof profiles !== 'object' || typeof _pingCategory !== 'function') return;
        const isGroup = typeof _isGroupNode === 'function' ? _isGroupNode : () => false;
        const cats = Object.keys(profiles).filter(c => profiles[c] && Array.isArray(profiles[c].nodes) && profiles[c].nodes.some(n => !isGroup(n)));
        if (cats.length === 0) {
            if (typeof showToast === 'function') showToast(t('toast_no_nodes_to_ping'), 'info');
            return;
        }
        if (typeof showToast === 'function') showToast(t('toast_pinging_all'), 'info');
        await Promise.all(cats.map(c => _pingCategory(c, 'tcp')));
    };

    window.quickClearAllConfigs = function () {
        if (typeof profiles !== 'object') return;
        if (Object.keys(profiles).length === 0 && !activeConfig) {
            if (typeof showToast === 'function') showToast(t('toast_already_empty'), 'info');
            return;
        }
        if (!confirm(t('confirm_clear_all'))) return;
        profiles = {};
        activeConfig = null;
        if (typeof saveProfiles === 'function') saveProfiles();
        if (typeof execShell === 'function' && typeof shQuote === 'function' && typeof ACTIVE_FILE !== 'undefined') {
            execShell(`rm -f ${shQuote(ACTIVE_FILE)}`, () => {});
        }
        if (typeof renderProfiles === 'function') renderProfiles();
        if (typeof applyActiveConfig === 'function') applyActiveConfig({ onlyIfRunning: true });
        if (typeof showToast === 'function') showToast(t('toast_cleared_all'), 'success');
    };

    // Mount Quick Actions Bar on Dashboard
    if (!document.getElementById('quick-actions-bar')) {
        const dash = document.getElementById('tab-dashboard');
        const anchor = document.getElementById('pro-config-section');
        if (dash && anchor) {
            const bar = document.createElement('div');
            bar.className = 'quick-actions-bar';
            bar.id = 'quick-actions-bar';
            bar.innerHTML =
                '<button type="button" class="quick-action-btn quick-action-primary" onclick="importFromClipboard()" data-i18n="quick_paste">Dán Clipboard</button>' +
                '<button type="button" class="quick-action-btn" onclick="quickReloadAllConfigs()" data-i18n="quick_update">Cập nhật</button>' +
                '<button type="button" class="quick-action-btn" onclick="quickPingAllConfigs()" data-i18n="quick_ping">Kiểm tra Ping</button>' +
                '<button type="button" class="quick-action-btn quick-action-danger" onclick="quickClearAllConfigs()" data-i18n="quick_clear">Xóa hết</button>';
            dash.insertBefore(bar, anchor);
            if (typeof applyI18n === 'function') applyI18n();
        }
    }
})();
