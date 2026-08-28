/**
 * Marquee Text - GNOME Shell Extension
 * Menampilkan teks berjalan (scrolling marquee) yang mulus ber-FPS tinggi (hardware-accelerated) di panel GNOME Shell.
 *
 * Ukuran panel dan tombol tetap statis (diam), hanya teks di dalam viewport yang bergerak mulus.
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

// Viewport khusus dengan lebar statis (fixed width) yang tidak berubah saat teks di dalamnya bergerak
const MarqueeViewport = GObject.registerClass(
class MarqueeViewport extends St.Widget {
    _init(params = {}) {
        super._init({
            style_class: 'marquee-viewport',
            clip_to_allocation: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.START,
            ...params,
        });
        this._viewportWidth = 200;
    }

    setViewportWidth(w) {
        this._viewportWidth = Math.max(30, Math.round(w));
        this.set_width(this._viewportWidth);
        this.queue_relayout();
    }

    vfunc_get_preferred_width(_forHeight) {
        // Mengembalikan lebar tetap agar ukuran panel GNOME tetap diam/statis
        const w = this._viewportWidth || 200;
        return [w, w];
    }

    vfunc_get_preferred_height(forWidth) {
        if (this.first_child) {
            return this.first_child.get_preferred_height(forWidth);
        }
        return [0, 0];
    }

    vfunc_allocate(box) {
        this.set_allocation(box);
        const child = this.first_child;
        if (child) {
            const height = box.y2 - box.y1;
            const [, natW] = child.get_preferred_width(height);
            const childW = Math.max(this._viewportWidth, natW);

            const childBox = new Clutter.ActorBox();
            childBox.x1 = 0;
            childBox.y1 = 0;
            childBox.x2 = childW;
            childBox.y2 = height;
            child.allocate(childBox);
        }
    }
});

const MarqueeIndicator = GObject.registerClass(
class MarqueeIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, 'Marquee Text Indicator', false);
        this._extension = extension;
        this._settings = extension.getSettings();

        this._settingsSignals = [];
        this._isDestroyed = false;
        this._unitWidth = 0;
        this._idleId = null;

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

        // Viewport Clip Container dengan ukuran lebar statis
        this._viewport = new MarqueeViewport();

        // Scroll Box: wadah yang digeser secara GPU transform (translation_x) tanpa mengubah layout panel
        this._scrollBox = new St.BoxLayout({
            style_class: 'marquee-scroll-box',
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.START,
        });

        // Label-label kembar untuk efek looping berkesinambungan tanpa jeda
        this._labels = [];
        for (let i = 0; i < 2; i++) {
            const label = new St.Label({
                text: '',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'marquee-label',
            });
            this._labels.push(label);
            this._scrollBox.add_child(label);
        }

        this._viewport.add_child(this._scrollBox);
        this._box.add_child(this._viewport);
        this.add_child(this._box);

        this._buildMenu();
        this._applyDimensions();
        this._connectSettings();

        // Mulai pembaruan konten dan animasi setelah actor terpasang di panel
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = null;
            if (!this._isDestroyed) {
                this._updateContent();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _applyDimensions() {
        if (this._isDestroyed || !this._box) return;

        const padLeft = this._settings.get_int('panel-padding-left');
        const padRight = this._settings.get_int('panel-padding-right');
        const marLeft = this._settings.get_int('panel-margin-left');
        const marRight = this._settings.get_int('panel-margin-right');
        const spacing = this._settings.get_int('item-spacing');

        this._box.set_style(
            `padding-left: ${padLeft}px; ` +
            `padding-right: ${padRight}px; ` +
            `margin-left: ${marLeft}px; ` +
            `margin-right: ${marRight}px; ` +
            `spacing: ${spacing}px;`
        );
    }

    _calculateViewportWidth() {
        const widthMode = this._settings.get_string('width-mode') || 'chars';
        if (widthMode === 'pixels') {
            const customWidth = this._settings.get_int('custom-width');
            return Math.max(30, customWidth);
        }

        const visibleLength = Math.max(5, this._settings.get_int('visible-length'));
        
        // Ukur estimasi lebar representatif teks berdasarkan font saat ini
        const sample = new St.Label({
            text: '0'.repeat(visibleLength),
            style_class: 'marquee-label',
        });
        const [, natW] = sample.get_preferred_width(-1);
        sample.destroy();

        return Math.max(40, Math.round(natW));
    }

    _calculateDuration(distance, speedSetting) {
        // scroll-speed mewakili ms per pergeseran setara 1 lebar karakter (~9px)
        const speed = Math.max(10, speedSetting || this._settings.get_int('scroll-speed'));
        const durationMs = Math.round(distance * (speed / 9.0));
        return Math.max(50, durationMs);
    }

    _updateContent() {
        if (this._isDestroyed) return;

        const rawText = this._settings.get_string('custom-text') || '';
        const separator = this._settings.get_string('separator') || '   ★   ';
        const showIcon = this._settings.get_boolean('show-icon');

        this._icon.visible = showIcon;

        if (!rawText.trim()) {
            this._scrollBox.remove_all_transitions();
            this._labels.forEach(l => l.set_text(''));
            this._scrollBox.translation_x = 0;
            return;
        }

        const fullString = rawText + separator;
        this._labels.forEach(l => l.set_text(fullString));

        const viewportWidth = this._calculateViewportWidth();
        this._viewport.setViewportWidth(viewportWidth);

        const [, unitW] = this._labels[0].get_preferred_width(-1);
        this._unitWidth = Math.max(1, Math.round(unitW));

        // Pastikan jumlah label cukup untuk mengisi viewport + 1 unit ekstra untuk looping tanpa jeda
        const neededLabels = Math.max(2, Math.ceil(viewportWidth / this._unitWidth) + 1);

        while (this._labels.length < neededLabels) {
            const label = new St.Label({
                text: fullString,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'marquee-label',
            });
            this._labels.push(label);
            this._scrollBox.add_child(label);
        }

        while (this._labels.length > neededLabels && this._labels.length > 2) {
            const label = this._labels.pop();
            this._scrollBox.remove_child(label);
            label.destroy();
        }

        this._startAnimation();
    }

    _startAnimation() {
        if (this._isDestroyed || this._unitWidth <= 0) return;

        const isPaused = this._settings.get_boolean('is-paused');
        if (isPaused) {
            this._scrollBox.remove_all_transitions();
            return;
        }

        const direction = this._settings.get_string('scroll-direction');
        const speed = Math.max(10, this._settings.get_int('scroll-speed'));
        const duration = this._calculateDuration(this._unitWidth, speed);

        this._scrollBox.remove_all_transitions();

        if (direction === 'ltr') {
            this._scrollBox.translation_x = -this._unitWidth;
            this._scrollBox.ease({
                translation_x: 0,
                duration: duration,
                mode: Clutter.AnimationMode.LINEAR,
                onComplete: () => {
                    if (!this._isDestroyed && !this._settings.get_boolean('is-paused')) {
                        this._scrollBox.translation_x = -this._unitWidth;
                        this._startAnimation();
                    }
                },
            });
        } else {
            // Default RTL (Kanan ke Kiri)
            this._scrollBox.translation_x = 0;
            this._scrollBox.ease({
                translation_x: -this._unitWidth,
                duration: duration,
                mode: Clutter.AnimationMode.LINEAR,
                onComplete: () => {
                    if (!this._isDestroyed && !this._settings.get_boolean('is-paused')) {
                        this._scrollBox.translation_x = 0;
                        this._startAnimation();
                    }
                },
            });
        }
    }

    _pauseAnimation() {
        if (this._isDestroyed) return;
        this._scrollBox.remove_all_transitions();
    }

    _resumeAnimation() {
        if (this._isDestroyed || this._settings.get_boolean('is-paused') || this._unitWidth <= 0) return;

        const direction = this._settings.get_string('scroll-direction');
        const speed = Math.max(10, this._settings.get_int('scroll-speed'));
        const totalDuration = this._calculateDuration(this._unitWidth, speed);

        this._scrollBox.remove_all_transitions();

        if (direction === 'ltr') {
            let curX = this._scrollBox.translation_x;
            if (curX > 0 || curX < -this._unitWidth) {
                curX = -this._unitWidth;
                this._scrollBox.translation_x = curX;
            }
            const remainingDist = Math.abs(0 - curX);
            const duration = Math.max(20, Math.round(totalDuration * (remainingDist / this._unitWidth)));

            this._scrollBox.ease({
                translation_x: 0,
                duration: duration,
                mode: Clutter.AnimationMode.LINEAR,
                onComplete: () => {
                    if (!this._isDestroyed && !this._settings.get_boolean('is-paused')) {
                        this._scrollBox.translation_x = -this._unitWidth;
                        this._startAnimation();
                    }
                },
            });
        } else {
            let curX = this._scrollBox.translation_x;
            if (curX < -this._unitWidth || curX > 0) {
                curX = 0;
                this._scrollBox.translation_x = curX;
            }
            const remainingDist = Math.abs(-this._unitWidth - curX);
            const duration = Math.max(20, Math.round(totalDuration * (remainingDist / this._unitWidth)));

            this._scrollBox.ease({
                translation_x: -this._unitWidth,
                duration: duration,
                mode: Clutter.AnimationMode.LINEAR,
                onComplete: () => {
                    if (!this._isDestroyed && !this._settings.get_boolean('is-paused')) {
                        this._scrollBox.translation_x = 0;
                        this._startAnimation();
                    }
                },
            });
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
            this._icon.visible = this._settings.get_boolean('show-icon');
        });
        const speedSignal = this._settings.connect('changed::scroll-speed', () => {
            this._startAnimation();
        });
        const lenSignal = this._settings.connect('changed::visible-length', () => {
            this._updateContent();
        });
        const dirSignal = this._settings.connect('changed::scroll-direction', () => {
            this._startAnimation();
        });
        const pauseSignal = this._settings.connect('changed::is-paused', () => {
            this._updatePauseMenuItem();
            if (this._settings.get_boolean('is-paused')) {
                this._pauseAnimation();
            } else {
                this._resumeAnimation();
            }
        });

        const padLeftSignal = this._settings.connect('changed::panel-padding-left', () => {
            this._applyDimensions();
        });
        const padRightSignal = this._settings.connect('changed::panel-padding-right', () => {
            this._applyDimensions();
        });
        const marLeftSignal = this._settings.connect('changed::panel-margin-left', () => {
            this._applyDimensions();
        });
        const marRightSignal = this._settings.connect('changed::panel-margin-right', () => {
            this._applyDimensions();
        });
        const spacingSignal = this._settings.connect('changed::item-spacing', () => {
            this._applyDimensions();
        });
        const widthModeSignal = this._settings.connect('changed::width-mode', () => {
            this._updateContent();
        });
        const customWidthSignal = this._settings.connect('changed::custom-width', () => {
            this._updateContent();
        });

        this._settingsSignals.push(
            textSignal, sepSignal, iconSignal,
            speedSignal, lenSignal, dirSignal, pauseSignal,
            padLeftSignal, padRightSignal, marLeftSignal, marRightSignal,
            spacingSignal, widthModeSignal, customWidthSignal
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
        this._isDestroyed = true;

        if (this._idleId) {
            GLib.Source.remove(this._idleId);
            this._idleId = null;
        }

        if (this._scrollBox) {
            this._scrollBox.remove_all_transitions();
            this._scrollBox.translation_x = 0;
        }

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
