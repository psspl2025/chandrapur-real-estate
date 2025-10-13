import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { API_BASE } from "../../src/config";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ProjectDetail() {
  const { id } = useLocalSearchParams();
  const [detail, setDetail] = useState<any>(null);
  const router = useRouter();

  async function load() {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    setDetail(await res.json());
  }

  useEffect(() => { load(); }, [id]);

  if (!detail) return <View style={{ flex: 1, backgroundColor: "#0f172a" }} />;

  const docs = Array.isArray(detail.documents) ? detail.documents : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a", padding: 12 }}>
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>{detail.projectName}</Text>
      <Text style={{ color: "#94a3b8", marginBottom: 6 }}>Documents</Text>

      {docs.map((d) => (
        <View key={d.name} style={{ backgroundColor: "#1f2937", padding: 10, borderRadius: 10, marginBottom: 8 }}>
          <Text style={{ color: "#e5e7eb", marginBottom: 8 }}>{d.name}</Text>
          <View style={{ flexDirection: "row", columnGap: 12 }}>
            {d?.file?.viewLink ? (
              <TouchableOpacity onPress={() => router.push({ pathname: "/webview", params: { url: d.file.viewLink } })}>
                <Text style={{ color: "#38bdf8" }}>View</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => router.push({ pathname: "/scan", params: { id, label: d.name } })}>
              <Text style={{ color: "#34d399" }}>Scan / Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
