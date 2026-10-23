<template>
  <section class="profile-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">Cuenta</span>
        <h1>Mi perfil</h1>
        <p>Consulta y actualiza los datos personales de tu cuenta.</p>
      </div>
    </header>

    <div v-if="loading" class="state-card">Cargando tus datos…</div>
    <div v-else class="profile-card page-card">
      <div class="profile-identity">
        <div class="large-avatar">{{ initial }}</div>
        <div>
          <strong>{{ form.nombre || "Usuario" }}</strong>
          <span>{{ form.email }}</span>
        </div>
      </div>

      <form @submit.prevent="saveProfile">
        <BaseInput v-model="form.nombre" label="Nombre" autocomplete="name" :disabled="!editing" required />
        <BaseInput v-model="form.email" label="Correo electrónico" type="email" autocomplete="email" :disabled="!editing" required />
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <p v-if="saved" class="form-success" role="status">Tus datos fueron actualizados.</p>
        <div class="form-actions">
          <BaseButton v-if="!editing" type="button" @click="startEditing">Editar perfil</BaseButton>
          <template v-else>
            <BaseButton variant="ghost" type="button" :disabled="saving" @click="cancelEditing">Cancelar</BaseButton>
            <BaseButton type="submit" :disabled="saving">{{ saving ? "Guardando…" : "Guardar cambios" }}</BaseButton>
          </template>
        </div>
      </form>

      <div v-if="profile?.created_at" class="created-date">
        Cuenta creada el {{ formatDate(profile.created_at) }}
      </div>
    </div>

    <div class="security-card page-card">
      <div class="security-heading">
        <span class="eyebrow">Seguridad</span>
        <h2>Cambiar contraseña</h2>
        <p>Al actualizarla, tendrás que iniciar sesión nuevamente.</p>
      </div>
      <form @submit.prevent="changePassword">
        <div v-for="field in passwordFields" :key="field.key" class="password-row">
          <BaseInput
            v-model="passwordForm[field.key]"
            :label="field.label"
            :type="passwordTypes[field.key] ? 'text' : 'password'"
            :autocomplete="field.autocomplete"
            :disabled="passwordSaving"
            required
          />
          <button class="visibility-button" type="button" @click="passwordTypes[field.key] = !passwordTypes[field.key]">
            {{ passwordTypes[field.key] ? "Ocultar" : "Mostrar" }}
          </button>
        </div>
        <ul class="password-rules">
          <li :class="{ valid: passwordForm.newPassword.length >= 10 }">Mínimo 10 caracteres</li>
          <li :class="{ valid: /[A-ZÁÉÍÓÚÑ]/.test(passwordForm.newPassword) }">Una mayúscula</li>
          <li :class="{ valid: /[a-záéíóúñ]/.test(passwordForm.newPassword) }">Una minúscula</li>
          <li :class="{ valid: /\d/.test(passwordForm.newPassword) && /[^\p{L}\p{N}\s]/u.test(passwordForm.newPassword) }">Un número y un símbolo</li>
        </ul>
        <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="form-success" role="status">{{ passwordSuccess }}</p>
        <div class="form-actions"><BaseButton type="submit" :disabled="passwordSaving">{{ passwordSaving ? "Actualizando…" : "Actualizar contraseña" }}</BaseButton></div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/common/BaseButton.vue";
import BaseInput from "../components/common/BaseInput.vue";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../stores/authStore";
import { usePredioStore } from "../stores/predioStore";
import { useRealtimeStore } from "../stores/realtimeStore";

const auth = useAuthStore();
const router = useRouter();
const predio = usePredioStore();
const realtime = useRealtimeStore();
const profile = ref(null);
const loading = ref(true);
const saving = ref(false);
const editing = ref(false);
const error = ref("");
const saved = ref(false);
const form = reactive({ nombre: "", email: "" });
const passwordForm = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
const passwordTypes = reactive({ currentPassword: false, newPassword: false, confirmPassword: false });
const passwordFields = [
  { key: "currentPassword", label: "Contraseña actual", autocomplete: "current-password" },
  { key: "newPassword", label: "Nueva contraseña", autocomplete: "new-password" },
  { key: "confirmPassword", label: "Confirmar nueva contraseña", autocomplete: "new-password" },
];
const passwordSaving = ref(false);
const passwordError = ref("");
const passwordSuccess = ref("");
const initial = computed(() => (form.nombre || "U").trim().charAt(0).toUpperCase());

function copyProfile(user) {
  profile.value = user;
  form.nombre = user?.nombre || "";
  form.email = user?.email || "";
}
function startEditing() {
  saved.value = false;
  error.value = "";
  editing.value = true;
}
function cancelEditing() {
  copyProfile(profile.value);
  editing.value = false;
  error.value = "";
}
function formatDate(value) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(value));
}
async function loadProfile() {
  loading.value = true;
  try {
    copyProfile(await authApi.profile());
  } catch (err) {
    error.value = err.message || "No se pudo cargar el perfil.";
  } finally {
    loading.value = false;
  }
}
async function saveProfile() {
  error.value = "";
  saved.value = false;
  if (form.nombre.trim().length < 2) {
    error.value = "El nombre debe tener al menos 2 caracteres.";
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    error.value = "Escribe un correo electrónico válido.";
    return;
  }
  saving.value = true;
  try {
    const updated = await authApi.updateProfile({ nombre: form.nombre, email: form.email });
    copyProfile(updated);
    auth.setUsuario(updated);
    editing.value = false;
    saved.value = true;
  } catch (err) {
    error.value = err.message || "No se pudieron guardar los cambios.";
  } finally {
    saving.value = false;
  }
}
async function changePassword() {
  passwordError.value = "";
  passwordSuccess.value = "";
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = "La confirmación no coincide con la nueva contraseña.";
    return;
  }
  if (passwordForm.currentPassword === passwordForm.newPassword) {
    passwordError.value = "La nueva contraseña debe ser diferente a la actual.";
    return;
  }
  passwordSaving.value = true;
  try {
    const result = await authApi.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    passwordSuccess.value = result.message || "Contraseña actualizada.";
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
    realtime.disconnect();
    predio.clear();
    auth.logout();
    setTimeout(() => router.replace("/login"), 900);
  } catch (err) {
    passwordError.value = err.message || "No se pudo actualizar la contraseña.";
  } finally {
    passwordSaving.value = false;
  }
}
onMounted(loadProfile);
</script>

<style scoped>
.profile-page { width: min(100%, 720px); margin: 0 auto; }
.page-heading { margin-bottom: 22px; }
.eyebrow { color: var(--color-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 6px 0; color: #eaf3ff; font-size: clamp(28px, 5vw, 38px); }
.page-heading p { margin: 0; color: var(--color-muted); }
.profile-card { padding: 26px; }
.profile-identity { display: flex; align-items: center; gap: 14px; padding-bottom: 22px; margin-bottom: 22px; border-bottom: 1px solid var(--color-line); }
.large-avatar { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; background: var(--color-primary-soft); color: var(--color-primary); font-size: 25px; font-weight: 800; }
.profile-identity strong, .profile-identity span { display: block; }
.profile-identity strong { color: #eaf3ff; font-size: 18px; }
.profile-identity span { margin-top: 4px; color: var(--color-muted); font-size: 13px; }
form { display: grid; gap: 16px; }
.form-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 4px; }
.form-error { margin: 0; color: #ffb3bd; font-size: 13px; }
.form-success { margin: 0; color: var(--color-success); font-size: 13px; }
.created-date { margin-top: 22px; color: var(--color-muted); font-size: 12px; }
.state-card { padding: 28px; border: 1px solid var(--color-line); border-radius: var(--radius-md); color: var(--color-muted); background: var(--color-surface); }
.security-card { padding: 26px; margin-top: 18px; }
.security-heading { margin-bottom: 20px; }
.security-heading h2 { margin: 6px 0; color: #eaf3ff; font-size: 20px; }
.security-heading p { margin: 0; color: var(--color-muted); font-size: 13px; }
.password-row { display: flex; align-items: flex-end; gap: 8px; }
.password-row :deep(.field) { flex: 1; }
.visibility-button { min-height: 40px; padding: 0 9px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); background: transparent; color: var(--color-primary); font-size: 12px; font-weight: 700; cursor: pointer; }
.password-rules { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 18px; margin: 0; padding: 0; color: var(--color-muted); list-style: none; font-size: 12px; }
.password-rules li::before { content: "○"; display: inline-block; width: 18px; color: var(--color-muted); }
.password-rules li.valid { color: var(--color-success); }
.password-rules li.valid::before { content: "✓"; color: var(--color-success); }
@media (max-width: 560px) { .profile-card { padding: 20px; } .form-actions { justify-content: stretch; } .form-actions > * { flex: 1; } }
@media (max-width: 560px) { .security-card { padding: 20px; } .password-rules { grid-template-columns: 1fr; } }
</style>
