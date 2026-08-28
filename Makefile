UUID = marquee-text@fahrudin.dev
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
ZIP_NAME = $(UUID).shell-extension.zip

.PHONY: all compile install uninstall enable disable prefs pack clean check

all: compile

compile:
	glib-compile-schemas --strict schemas/

install: compile
	@echo "Menginstall ekstensi ke $(INSTALL_DIR)..."
	mkdir -p $(INSTALL_DIR)
	cp -r metadata.json extension.js prefs.js stylesheet.css schemas $(INSTALL_DIR)/
	@echo "Instalasi selesai!"
	@echo "Jika menggunakan X11, tekan Alt+F2 lalu ketik 'r' dan Enter untuk me-restart GNOME Shell."
	@echo "Jika menggunakan Wayland, silakan Logout dan Login kembali untuk memuat ekstensi baru."
	@echo "Setelah itu, aktifkan dengan: make enable"

uninstall:
	@echo "Menghapus ekstensi dari $(INSTALL_DIR)..."
	rm -rf $(INSTALL_DIR)
	@echo "Ekstensi berhasil dihapus."

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

prefs:
	gnome-extensions prefs $(UUID)

pack: compile
	@echo "Membuat paket zip untuk upload ke extensions.gnome.org..."
	gnome-extensions pack --force \
		--extra-source=schemas/gschemas.compiled \
		--extra-source=stylesheet.css
	@echo "Paket berhasil dibuat: $(ZIP_NAME)"

clean:
	rm -f schemas/gschemas.compiled
	rm -f $(ZIP_NAME)
