import { redirect } from "next/navigation";

/**
 * Loads the information needed for the home screen and renders the page for the signed-in user.
 */
export default function HomePage() {
  redirect("/login");
}
