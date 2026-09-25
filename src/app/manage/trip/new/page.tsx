import { TripStudio } from "@/components/TripStudio";

export const metadata = {
  title: "Călătorie Nouă — Wayward Atlas Studio",
  description: "Creează și organizează o nouă călătorie sau expediție pe atlas.",
};

export default function NewTripPage() {
  return <TripStudio mode="create" />;
}
