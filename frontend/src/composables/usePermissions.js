import { computed } from "vue";
import { usePredioStore } from "../stores/predioStore";
export function usePermissions() {
  const predio = usePredioStore();
  return {
    esAdministrador: computed(
      () => predio.predioActual.value?.rol === "administrador",
    ),
  };
}
