/**
 * Marquee Text - Preferences
 * Halaman Pengaturan Berbasis Libadwaita (GNOME 45+)
 */

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MarqueePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Buat Halaman Utama
        const page = new Adw.PreferencesPage({
            title: _('Pengaturan'),
            icon_name: 'preferences-other-symbolic',
        });
        window.add(page);

        // ==========================================
        // 1. GROUP: Teks & Konten
        // ==========================================
        const textGroup = new Adw.PreferencesGroup({
            title: _('Teks & Konten'),
            description: _('Tuliskan teks yang ingin ditampilkan berjalan di top bar GNOME Shell'),
        });
        page.add(textGroup);

        // Input Teks Berjalan
        const textRow = new Adw.EntryRow({
            title: _('Teks Berjalan'),
            text: settings.get_string('custom-text'),
            show_apply_button: true,
        });
        textRow.connect('apply', (row) => {
            settings.set_string('custom-text', row.get_text());
        });
        textRow.connect('changed', (row) => {
            settings.set_string('custom-text', row.get_text());
        });
        textGroup.add(textRow);

        // Karakter Pemisah
        const separatorRow = new Adw.EntryRow({
            title: _('Karakter Pemisah (Separator)'),
            text: settings.get_string('separator'),
            show_apply_button: true,
        });
        separatorRow.connect('apply', (row) => {
            settings.set_string('separator', row.get_text());
        });
        separatorRow.connect('changed', (row) => {
            settings.set_string('separator', row.get_text());
        });
        textGroup.add(separatorRow);

        // ==========================================
        // 2. GROUP: Tampilan & Posisi Panel
        // ==========================================
        const layoutGroup = new Adw.PreferencesGroup({
            title: _('Tampilan & Posisi Panel'),
            description: _('Pilih letak penempatan teks pada panel atas (kiri, tengah, atau kanan)'),
        });
        page.add(layoutGroup);

        // Dropdown Posisi Panel
        const posModel = new Gtk.StringList();
        posModel.append(_('Kiri (Left)'));
        posModel.append(_('Tengah (Center)'));
        posModel.append(_('Kanan (Right)'));

        const posKeys = ['left', 'center', 'right'];
        const currentPos = settings.get_string('panel-position');
        let selectedPosIdx = posKeys.indexOf(currentPos);
        if (selectedPosIdx === -1) selectedPosIdx = 2; // default right

        const positionRow = new Adw.ComboRow({
            title: _('Posisi di Top Panel'),
            subtitle: _('Letak widget di baris atas desktop'),
            model: posModel,
            selected: selectedPosIdx,
        });
        positionRow.connect('notify::selected', (row) => {
            const idx = row.selected;
            if (idx >= 0 && idx < posKeys.length) {
                settings.set_string('panel-position', posKeys[idx]);
            }
        });
        layoutGroup.add(positionRow);

        // Panjang Karakter Terlihat
        const visibleLenAdjustment = new Gtk.Adjustment({
            lower: 5,
            upper: 150,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('visible-length'),
        });
        const visibleLenRow = new Adw.SpinRow({
            title: _('Panjang Karakter Terlihat (Lebar Area)'),
            subtitle: _('Banyaknya karakter teks yang terlihat sekaligus di panel'),
            adjustment: visibleLenAdjustment,
        });
        settings.bind('visible-length', visibleLenAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        layoutGroup.add(visibleLenRow);

        // Toggle Tampilkan Ikon
        const iconRow = new Adw.SwitchRow({
            title: _('Tampilkan Ikon Ticker'),
            subtitle: _('Tampilkan ikon kecil di samping teks berjalan'),
            active: settings.get_boolean('show-icon'),
        });
        settings.bind('show-icon', iconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        layoutGroup.add(iconRow);

        // ==========================================
        // 3. GROUP: Kecepatan & Arah Animasi
        // ==========================================
        const animGroup = new Adw.PreferencesGroup({
            title: _('Kecepatan & Arah Gerak (Smooth FPS)'),
            description: _('Atur tempo pergerakan teks dan arah animasi berkecepatan tinggi'),
        });
        page.add(animGroup);

        // Kecepatan Scroll
        const speedAdjustment = new Gtk.Adjustment({
            lower: 20,
            upper: 1000,
            step_increment: 10,
            page_increment: 50,
            value: settings.get_int('scroll-speed'),
        });
        const speedRow = new Adw.SpinRow({
            title: _('Kecepatan Scroll (ms)'),
            subtitle: _('Semakin kecil nilainya, semakin cepat laju teks (Disarankan: 100 - 200 ms)'),
            adjustment: speedAdjustment,
        });
        settings.bind('scroll-speed', speedAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        animGroup.add(speedRow);

        // Arah Pergerakan
        const dirModel = new Gtk.StringList();
        dirModel.append(_('Kanan ke Kiri (RTL) - Standar'));
        dirModel.append(_('Kiri ke Kanan (LTR)'));

        const dirKeys = ['rtl', 'ltr'];
        const currentDir = settings.get_string('scroll-direction');
        let selectedDirIdx = dirKeys.indexOf(currentDir);
        if (selectedDirIdx === -1) selectedDirIdx = 0;

        const dirRow = new Adw.ComboRow({
            title: _('Arah Geseran Teks'),
            model: dirModel,
            selected: selectedDirIdx,
        });
        dirRow.connect('notify::selected', (row) => {
            const idx = row.selected;
            if (idx >= 0 && idx < dirKeys.length) {
                settings.set_string('scroll-direction', dirKeys[idx]);
            }
        });
        animGroup.add(dirRow);

        // Toggle Jeda (Pause)
        const pauseRow = new Adw.SwitchRow({
            title: _('Jeda Animasi (Pause)'),
            subtitle: _('Hentikan sementara pergerakan teks berjalan'),
            active: settings.get_boolean('is-paused'),
        });
        settings.bind('is-paused', pauseRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        animGroup.add(pauseRow);

        // ==========================================
        // 4. GROUP: Contoh Preset Teks Cepat
        // ==========================================
        const presetGroup = new Adw.PreferencesGroup({
            title: _('Templat / Preset Teks Cepat'),
            description: _('Klik salah satu tombol untuk menerapkan contoh teks langsung'),
        });
        page.add(presetGroup);

        const presets = [
            {
                name: _('Motivasi Harian 🚀'),
                text: '🔥 Tetap Fokus, Tetap Semangat! Kesuksesan Dimulai Dari Hari Ini! 🚀✨',
            },
            {
                name: _('Mode Kerja / Fokus 💻'),
                text: '⚡ Deep Work Mode Active: No Distraction, Just Execution! 🎯',
            },
            {
                name: _('Salam Indonesia 🇮🇩'),
                text: '🇮🇩 Selamat Datang di GNOME Shell! Bangga Karya Anak Bangsa! 🌟',
            },
        ];

        presets.forEach(preset => {
            const actionRow = new Adw.ActionRow({
                title: preset.name,
                subtitle: preset.text,
            });
            const applyBtn = new Gtk.Button({
                label: _('Gunakan'),
                valign: Gtk.Align.CENTER,
            });
            applyBtn.connect('clicked', () => {
                textRow.set_text(preset.text);
                settings.set_string('custom-text', preset.text);
            });
            actionRow.add_suffix(applyBtn);
            presetGroup.add(actionRow);
        });
    }
}
