import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

window.malsseumAndroidApp = Capacitor.getPlatform() === 'android' ? App : null;
