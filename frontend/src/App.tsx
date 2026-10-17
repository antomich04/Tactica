import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./Providers/AuthProvider";
import { router } from "./routes";

export function App() {
  
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}