/**
 * Marquee Text - GNOME Shell Extension
 * Menampilkan teks berjalan (scrolling marquee) yang dapat dikustomisasi di panel GNOME Shell.
 *
 * Kompatibel dengan GNOME 45, 46, 47, 48, 50+ (ESM architecture).
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

const MarqueeIndicator = GObject.registerClass(
class MarqueeIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, 'Marquee Text Indicator', false);
        this._extension = extension;
        this._settings = extension.getSettings();

        this._timerId = null;
        this._settingsSignals = [];
        this._charSegments = [];
        this._offset = 0;

        // Container Box di Top Panel
        this._box = new St.BoxLayout({
            style_class: 'marquee-box',
            reactive: true,
            can_focus: true,
            track_hover: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Ikon opsional
        this._icon = new St.Icon({
            icon_name: 'view-wrapped-symbolic',
            style_class: 'system-status-icon marquee-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._box.add_child(this._icon);

        // Label teks berjalan
        this._label = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'marquee-label',
        });
        this._box.add_child(this._label);

        this.add_child(this._box);

        // Segmenter untuk menangani karakter Unicode & Emoji secara aman
        try {
            this._segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });
        } catch (e) {
            this._segmenter = null;
        }

        this._buildMenu();
        this._connectSettings();
        this._updateContent();
        this._restartTimer();
    }

    _splitGraphemes(text) {
        if (!text) return [];
        if (this._segmenter) {
            return Array.from(this._segmenter.segment(text), s => s.segment);
        }
        return Array.from(text);
    }

    _updateContent() {
        const rawText = this._settings.get_string('custom-text') || '';
        const separator = this._settings.get_string('separator') || '   ★   ';
        const showIcon = this._settings.get_boolean('show-icon');

        this._icon.visible = showIcon;

        const fullString = rawText + separator;
        this._charSegments = this._splitGraphemes(fullString);

        if (this._offset >= this._charSegments.length) {
            this._offset = 0;
        }

        this._renderFrame();
    }

    _renderFrame() {
        if (!this._charSegments || this._charSegments.length === 0) {
            this._label.set_text('');
            return;
        }

        const visibleLength = Math.max(5, this._settings.get_int('visible-length'));
        const total = this._charSegments.length;

        // Jika panjang teks lebih pendek dari jendela tampilan, tetap tampilkan teks penuh
        if (total <= visibleLength) {
            this._label.set_text(this._charSegments.join(''));
            return;
        }

        // Ambil potongan segmen karakter sesuai offset saat ini
        const frameChars = [];
        for (let i = 0; i < visibleLength; i++) {
            const idx = (this._offset + i) % total;
            frameChars.push(this._charSegments[idx]);
        }

        this._label.set_text(frameChars.join(''));
    }

    _stepAnimation() {
        const isPaused = this._settings.get_boolean('is-paused');
        if (isPaused || !this._charSegments || this._charSegments.length === 0) {
            return;
        }

        const total = this._charSegments.length;
        const direction = this._settings.get_string('scroll-direction');

        if (direction === 'ltr') {
            this._offset = (this._offset - 1 + total) % total;
        } else {
            // Default rtl (kanan ke kiri)
            this._offset = (this._offset + 1) % total;
        }

        this._renderFrame();
    }

    _restartTimer() {
        this._stopTimer();

        const speed = Math.max(30, this._settings.get_int('scroll-speed'));
        this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, speed, () => {
            this._stepAnimation();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopTimer() {
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
        }
    }

    _connectSettings() {
        const textSignal = this._settings.connect('changed::custom-text', () => {
            this._updateContent();
        });
        const sepSignal = this._settings.connect('changed::separator', () => {
            this._updateContent();
        });
        const iconSignal = this._settings.connect('changed::show-icon', () => {
            this._updateContent();
        });
        const speedSignal = this._settings.connect('changed::scroll-speed', () => {
            this._restartTimer();
        });
        const lenSignal = this._settings.connect('changed::visible-length', () => {
            this._renderFrame();
        });
        const pauseSignal = this._settings.connect('changed::is-paused', () => {
            this._updatePauseMenuItem();
        });

        this._settingsSignals.push(
            textSignal, sepSignal, iconSignal,
            speedSignal, lenSignal, pauseSignal
        );
    }

    _buildMenu() {
        // 1. Menu Header Info
        const headerItem = new PopupMenu.PopupMenuItem(_('Marquee Text Controller'), {
            reactive: false,
            can_focus: false,
            style_class: 'marquee-menu-header',
        });
        this.menu.addMenuItem(headerItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // 2. Pause / Resume Toggle
        this._pauseMenuItem = new PopupMenu.PopupSwitchMenuItem(
            _('Jeda Animasi (Pause)'),
            this._settings.get_boolean('is-paused')
        );
        this._pauseMenuItem.connect('toggled', (item) => {
            this._settings.set_boolean('is-paused', item.state);
        });
        this.menu.addMenuItem(this._pauseMenuItem);

        // 3. Submenu Posisi Cepat (Left, Center, Right)
        const posSubMenu = new PopupMenu.PopupSubMenuMenuItem(_('Pindah Posisi Panel'));
        
        const posOptions = [
            { key: 'left', label: _('Kiri (Left)') },
            { key: 'center', label: _('Tengah (Center)') },
            { key: 'right', label: _('Kanan (Right)') },
        ];

        posOptions.forEach(opt => {
            const item = new PopupMenu.PopupMenuItem(opt.label);
            item.connect('activate', () => {
                this._settings.set_string('panel-position', opt.key);
            });
            posSubMenu.menu.addMenuItem(item);
        });
        this.menu.addMenuItem(posSubMenu);

        // 4. Submenu Arah Cepat (RTL / LTR)
        const dirSubMenu = new PopupMenu.PopupSubMenuMenuItem(_('Arah Pergerakan'));
        const rtlItem = new PopupMenu.PopupMenuItem(_('Kanan ke Kiri (Default)'));
        rtlItem.connect('activate', () => {
            this._settings.set_string('scroll-direction', 'rtl');
        });
        dirSubMenu.menu.addMenuItem(rtlItem);

        const ltrItem = new PopupMenu.PopupMenuItem(_('Kiri ke Kanan'));
        ltrItem.connect('activate', () => {
            this._settings.set_string('scroll-direction', 'ltr');
        });
        dirSubMenu.menu.addMenuItem(ltrItem);
        this.menu.addMenuItem(dirSubMenu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // 5. Buka Preferensi / Settings Lengkap
        const prefsItem = new PopupMenu.PopupMenuItem(_('Pengaturan Ekstensi...'));
        prefsItem.connect('activate', () => {
            this._extension.openPreferences();
        });
        this.menu.addMenuItem(prefsItem);
    }

    _updatePauseMenuItem() {
        if (this._pauseMenuItem) {
            this._pauseMenuItem.setToggleState(this._settings.get_boolean('is-paused'));
        }
    }

    destroy() {
        this._stopTimer();

        if (this._settingsSignals && this._settingsSignals.length > 0) {
            this._settingsSignals.forEach(id => {
                try {
                    this._settings.disconnect(id);
                } catch (e) {
                    // Ignore already disconnected
                }
            });
            this._settingsSignals = [];
        }

        super.destroy();
    }
});

export default class MarqueeTextExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = null;
        this._posSignal = null;
        this._indexSignal = null;

        this._setupIndicator();

        // Monitor perubahan posisi/indeks panel untuk memindahkan posisi widget
        this._posSignal = this._settings.connect('changed::panel-position', () => {
            this._setupIndicator();
        });
        this._indexSignal = this._settings.connect('changed::panel-index', () => {
            this._setupIndicator();
        });
    }

    _setupIndicator() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        const position = this._settings.get_string('panel-position') || 'right';
        const index = this._settings.get_int('panel-index') || 0;

        this._indicator = new MarqueeIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, index, position);
    }

    disable() {
        if (this._posSignal) {
            this._settings.disconnect(this._posSignal);
            this._posSignal = null;
        }
        if (this._indexSignal) {
            this._settings.disconnect(this._indexSignal);
            this._indexSignal = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._settings = null;
    }
}
