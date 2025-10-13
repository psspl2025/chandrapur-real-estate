import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { API_BASE } from "../src/config";
import { useRouter } from "expo-router";

export default function Projects() {
  const [items, setItems] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/projects/summary?limit=100`);
      const data = await res.json();
      setItems(data.items || []);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 12 }}>
      <Text style={{ color: "#fff", fontSize: 20, marginBottom: 8 }}>Projects</Text>
      <FlatList
        data={items}
        keyExtractor={(x) => x._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/project/${item._id}`)}
            style={{ padding: 12, backgroundColor: "#1f2937", marginBottom: 8, borderRadius: 10 }}
          >
            <Text style={{ color: "#e5e7eb", fontWeight: "600" }}>{item.projectName}</Text>
            <Text style={{ color: "#94a3b8" }}>
              {item.locationDetails?.mouza} • {item.locationDetails?.district}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
