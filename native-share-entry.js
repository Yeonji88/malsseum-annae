import { Share } from '@capacitor/share';

window.malsseumNativeShare = async function(title, text, url) {
return Share.share({
  text: text,
  url: url,
  dialogTitle: '말씀 공유하기'
});
};
