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
            description: _('Tuliskan teks dan ikon yang ingin ditampilkan di top bar GNOME Shell'),
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

        // Toggle Tampilkan Ikon
        const iconRow = new Adw.SwitchRow({
            title: _('Tampilkan Ikon Ticker'),
            subtitle: _('Tampilkan ikon kecil di samping teks berjalan'),
            active: settings.get_boolean('show-icon'),
        });
        settings.bind('show-icon', iconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        textGroup.add(iconRow);

        // ==========================================
        // 2. GROUP: Posisi & Letak Panel
        // ==========================================
        const layoutGroup = new Adw.PreferencesGroup({
            title: _('Posisi & Letak Panel'),
            description: _('Pilih letak penempatan widget pada panel atas GNOME Shell'),
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
            subtitle: _('Bagian penempatan widget di panel'),
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

        // Panel Box Index (Urutan)
        const indexAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 50,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('panel-index'),
        });
        const indexRow = new Adw.SpinRow({
            title: _('Urutan Indeks di Panel'),
            subtitle: _('Menentukan urutan posisi di antara widget/ekstensi lainnya'),
            adjustment: indexAdjustment,
        });
        settings.bind('panel-index', indexAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        layoutGroup.add(indexRow);

        // ==========================================
        // 3. GROUP: Ukuran & Lebar Area Teks
        // ==========================================
        const sizeGroup = new Adw.PreferencesGroup({
            title: _('Ukuran & Lebar Area Teks'),
            description: _('Atur panjang atau lebar area tampilan teks yang terlihat di panel'),
        });
        page.add(sizeGroup);

        // Mode Lebar (Karakter / Piksel)
        const widthModeModel = new Gtk.StringList();
        widthModeModel.append(_('Berdasarkan Jumlah Karakter'));
        widthModeModel.append(_('Lebar Piksel Kustom (Fixed Width)'));

        const widthModeKeys = ['chars', 'pixels'];
        const currentWidthMode = settings.get_string('width-mode') || 'chars';
        let selectedWidthModeIdx = widthModeKeys.indexOf(currentWidthMode);
        if (selectedWidthModeIdx === -1) selectedWidthModeIdx = 0;

        const widthModeRow = new Adw.ComboRow({
            title: _('Mode Pengaturan Lebar'),
            subtitle: _('Pilih metode penentuan batas panjang area teks'),
            model: widthModeModel,
            selected: selectedWidthModeIdx,
        });
        sizeGroup.add(widthModeRow);

        // Panjang Karakter Terlihat (untuk mode Chars)
        const visibleLenAdjustment = new Gtk.Adjustment({
            lower: 5,
            upper: 200,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('visible-length'),
        });
        const visibleLenRow = new Adw.SpinRow({
            title: _('Panjang Karakter Terlihat (Mode Karakter)'),
            subtitle: _('Banyaknya karakter teks yang terlihat sekaligus di panel'),
            adjustment: visibleLenAdjustment,
        });
        settings.bind('visible-length', visibleLenAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        sizeGroup.add(visibleLenRow);

        // Lebar Kustom Piksel (untuk mode Pixels)
        const customWidthAdjustment = new Gtk.Adjustment({
            lower: 40,
            upper: 1500,
            step_increment: 10,
            page_increment: 50,
            value: settings.get_int('custom-width'),
        });
        const customWidthRow = new Adw.SpinRow({
            title: _('Lebar Kustom Piksel (Mode Piksel)'),
            subtitle: _('Lebar viewport teks tetap dalam satuan piksel (px)'),
            adjustment: customWidthAdjustment,
        });
        settings.bind('custom-width', customWidthAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        sizeGroup.add(customWidthRow);

        // Update sensitivitas baris berdasarkan mode lebar
        const updateWidthModeSensitivity = (idx) => {
            if (idx === 0) {
                visibleLenRow.set_sensitive(true);
                customWidthRow.set_sensitive(false);
            } else {
                visibleLenRow.set_sensitive(false);
                customWidthRow.set_sensitive(true);
            }
        };
        updateWidthModeSensitivity(selectedWidthModeIdx);

        widthModeRow.connect('notify::selected', (row) => {
            const idx = row.selected;
            if (idx >= 0 && idx < widthModeKeys.length) {
                settings.set_string('width-mode', widthModeKeys[idx]);
                updateWidthModeSensitivity(idx);
            }
        });

        // ==========================================
        // 4. GROUP: Jarak & Spasi Panel (Kiri, Kanan, & Spacing)
        // ==========================================
        const spacingGroup = new Adw.PreferencesGroup({
            title: _('Jarak & Spasi Panel (Kiri & Kanan)'),
            description: _('Atur bantalan (padding) dalam dan margin luar di sisi kiri dan kanan panel'),
        });
        page.add(spacingGroup);

        // Padding Kiri
        const padLeftAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('panel-padding-left'),
        });
        const padLeftRow = new Adw.SpinRow({
            title: _('Padding Sisi Kiri (px)'),
            subtitle: _('Jarak bantalan dalam di sebelah kiri widget'),
            adjustment: padLeftAdjustment,
        });
        settings.bind('panel-padding-left', padLeftAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        spacingGroup.add(padLeftRow);

        // Padding Kanan
        const padRightAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('panel-padding-right'),
        });
        const padRightRow = new Adw.SpinRow({
            title: _('Padding Sisi Kanan (px)'),
            subtitle: _('Jarak bantalan dalam di sebelah kanan widget'),
            adjustment: padRightAdjustment,
        });
        settings.bind('panel-padding-right', padRightAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        spacingGroup.add(padRightRow);

        // Margin Kiri
        const marLeftAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('panel-margin-left'),
        });
        const marLeftRow = new Adw.SpinRow({
            title: _('Margin Luar Sisi Kiri (px)'),
            subtitle: _('Jarak pemisah luar di sisi kiri widget'),
            adjustment: marLeftAdjustment,
        });
        settings.bind('panel-margin-left', marLeftAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        spacingGroup.add(marLeftRow);

        // Margin Kanan
        const marRightAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('panel-margin-right'),
        });
        const marRightRow = new Adw.SpinRow({
            title: _('Margin Luar Sisi Kanan (px)'),
            subtitle: _('Jarak pemisah luar di sisi kanan widget'),
            adjustment: marRightAdjustment,
        });
        settings.bind('panel-margin-right', marRightAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        spacingGroup.add(marRightRow);

        // Jarak Antara Ikon & Teks
        const spacingAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 50,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('item-spacing'),
        });
        const spacingRow = new Adw.SpinRow({
            title: _('Jarak Ikon & Teks (Spacing px)'),
            subtitle: _('Jarak pemisah antara ikon dan teks berjalan'),
            adjustment: spacingAdjustment,
        });
        settings.bind('item-spacing', spacingAdjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        spacingGroup.add(spacingRow);

        // ==========================================
        // 5. GROUP: Kecepatan & Arah Animasi
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
        // 6. GROUP: Contoh Preset Teks Cepat
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
