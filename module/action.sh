#!/system/bin/sh
#
# Hoang2Ray — manager "Action" button.
#
# Opens the Hoang2Ray app. If the app is not installed yet, it is installed
# first from the copy of the APK kept in the module ($MODDIR/app.apk).
# Supported by KernelSU, APatch and Magisk 27+; on older Magisk the button is
# simply not shown, so this file is inert there rather than broken.
#
# Output goes straight to the manager's action dialog, so keep it short.

MODDIR=${0%/*}
PKG="com.hoang2ray.app"
TMPAPK="/data/local/tmp/magic_v2ray_install.apk"

is_installed() {
    pm path "$PKG" 2>/dev/null | grep -q '^package:'
}

if ! is_installed; then
    if [ ! -s "$MODDIR/app.apk" ]; then
        echo "Hoang2Ray app is not installed and $MODDIR/app.apk is missing."
        echo "Flash the .apk (renamed to .zip) again to restore it."
        exit 1
    fi
    echo "Installing Hoang2Ray app..."
    if ! cp -f "$MODDIR/app.apk" "$TMPAPK" || ! chmod 644 "$TMPAPK"; then
        echo "Could not stage the APK for installation."
        rm -f "$TMPAPK"
        exit 1
    fi
    PMOUT="$(pm install -r "$TMPAPK" 2>&1)"
    rm -f "$TMPAPK"
    case "$PMOUT" in
        *Success*) echo "App installed." ;;
        *)
            echo "App install failed: $PMOUT"
            exit 1
            ;;
    esac
fi

echo "Starting Hoang2Ray..."
if ! am start --user 0 -n "$PKG/com.huskydg.magicv2ray.MainActivity" >/dev/null 2>&1; then
    # Fallback: let the package manager resolve the launcher activity.
    monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 \
        || { echo "Could not start the app."; exit 1; }
fi
exit 0
