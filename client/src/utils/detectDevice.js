export default function detectDevice() {
  return /Mobi|Android/i.test(navigator.userAgent);
}
