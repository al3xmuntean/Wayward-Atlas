import { TripStudio } from "@/components/TripStudio";

interface EditTripPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Editare Călătorie — Wayward Atlas Studio",
  description: "Editează detaliile, punctele geografice și fotografiile călătoriei.",
};

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { id } = await params;
  return <TripStudio mode="edit" tripId={id} />;
}
