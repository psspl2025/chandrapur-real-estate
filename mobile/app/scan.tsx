import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { API_BASE } from "../src/config";

async function makePdfFromImages(dataUrls: string[]) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const A4_W = 595, A4_H = 842;

  for (const dataUrl of dataUrls) {
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    let img; try { img = await pdf.embedJpg(bytes); } catch { img = await pdf.embedPng(bytes); }
    const page = pdf.addPage([A4_W, A4_H]);
    const iw = img.width, ih = img.height;
    const s = Math.min(A4_W / iw, A4_H / ih);
    const w = iw * s, h = ih * s;
    page.drawImage(img, { x: (A4_W - w)/2, y: (A4_H - h)/2, width: w, height: h });
  }
  const pdfBytes = await pdf.save();
  const path = `${FileSystem.cacheDirectory}scan-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(path, Buffer.from(pdfBytes).toString("base64"), { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

export default function Scan() {
  const { id, label } = useLocalSearchParams<{ id: string; label: string }>();
  const router = useRouter();
  const [pages, setPages] = useState<string[]>([]); // dataURLs

  async function addFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const photo = await ImagePicker.launchCameraAsync({ quality: 1, base64: true });
    if (!photo.canceled && photo.assets?.[0]?.base64) {
      setPages(p => [...p, `data:image/jpeg;base64,${photo.assets[0].base64}`]);
    }
  }
  async function addFromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, base64: true });
    if (!res.canceled) {
      const imgs = res.assets?.map(a => `data:${a.mimeType || "image/jpeg"};base64,${a.base64}`) || [];
      setPages(p => p.concat(imgs));
    }
  }
  function removePage(i: number) { setPages(p => p.filter((_, idx) => idx !== i)); }

  async function createAndUpload() {
    if (!pages.length) return;
    const pdfPath = await makePdfFromImages(pages);
    const pdfBase64 = await FileSystem.readAsStringAsync(pdfPath, { encoding: FileSystem.EncodingType.Base64 });
    const filename = `${label}-${Date.now()}.pdf`;

    const boundary = "----ExpoFormBoundary" + Math.random().toString(36).slice(2);
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="name"\r\n\r\n${label}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: application/pdf\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${pdfBase64}\r\n` +
      `--${boundary}--\r\n`;

    await fetch(`${API_BASE}/projects/${id}/documents/upload`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body
    });

    router.back();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a", padding: 12 }}>
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>Scan: {label}</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <TouchableOpacity onPress={addFromCamera} style={{ padding: 10, backgroundColor: "#1f2937", borderRadius: 8 }}>
          <Text style={{ color: "#fff" }}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={addFromGallery} style={{ padding: 10, backgroundColor: "#1f2937", borderRadius: 8 }}>
          <Text style={{ color: "#fff" }}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPages([])} style={{ padding: 10, backgroundColor: "#1f2937", borderRadius: 8 }}>
          <Text style={{ color: "#fff" }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {pages.map((p, i) => (
          <View key={i}>
            <Image source={{ uri: p }} style={{ width: 120, height: 170, borderRadius: 8 }} />
            <TouchableOpacity onPress={() => removePage(i)}>
              <Text style={{ color: "#fca5a5", textAlign: "center", marginTop: 4 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={createAndUpload}
        disabled={!pages.length}
        style={{ marginTop: 20, padding: 12, backgroundColor: "#065f46", borderRadius: 10, opacity: pages.length ? 1 : 0.5 }}
      >
        <Text style={{ color: "#d1fae5", textAlign: "center" }}>Create PDF & Upload</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
