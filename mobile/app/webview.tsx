import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
export default function WV() {
  const { url } = useLocalSearchParams<{ url: string }>();
  return <WebView source={{ uri: String(url) }} />;
}
