import { notFound } from "next/navigation";

export default function ObsWidgetPage() {
  // Загальний віджет більше не підтримується
  // Користувачі повинні використовувати /obs/{token}
  notFound();
}
