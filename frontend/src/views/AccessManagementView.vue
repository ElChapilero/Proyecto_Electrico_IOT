<template>
  <section class="access-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">Administración</span>
        <h1>Accesos y roles</h1>
        <p v-if="predio.predioActual.value">Gestiona quién puede consultar {{ predio.predioActual.value.nombre }}.</p>
        <p v-else>Selecciona un predio para administrar sus accesos.</p>
      </div>
      <span v-if="predio.predioActual.value" class="role-badge" :class="isAdmin ? 'role-admin' : 'role-reader'">
        {{ predio.predioActual.value.rol }}
      </span>
    </header>

    <div v-if="!predio.predioId.value" class="state-card page-card">
      Selecciona un predio en la barra superior para consultar sus accesos.
    </div>
    <div v-else-if="!isAdmin" class="state-card page-card restricted">
      <strong>Acceso restringido</strong>
      <span>Solo los administradores del predio pueden gestionar sus usuarios.</span>
    </div>
    <template v-else>
      <section class="add-card page-card">
        <div>
          <span class="section-kicker">Nuevo acceso</span>
          <h2>Vincular usuario lector</h2>
          <p>El usuario debe tener una cuenta registrada con ese correo.</p>
        </div>
        <form class="add-form" @submit.prevent="addAccess">
          <BaseInput v-model="email" label="Correo electrónico" type="email" placeholder="usuario@ejemplo.com" autocomplete="email" required />
          <BaseSelect v-model="role" label="Rol"><option value="lector">Lector</option></BaseSelect>
          <BaseButton type="submit" :disabled="saving">{{ saving ? "Vinculando…" : "Agregar acceso" }}</BaseButton>
        </form>
        <p v-if="message" class="form-message" :class="messageTone" role="status">{{ message }}</p>
      </section>

      <section class="list-card page-card">
        <div class="section-title"><div><span class="section-kicker">Usuarios vinculados</span><h2>Personas con acceso</h2></div><button class="refresh" type="button" :disabled="loading" @click="loadAccesses">Actualizar</button></div>
        <div v-if="loading" class="list-state">Cargando accesos…</div>
        <div v-else-if="!accesses.length" class="list-state">Todavía no hay usuarios vinculados a este predio.</div>
        <div v-else class="access-list">
          <article v-for="item in accesses" :key="item.id || item.id_usuario" class="access-item">
            <div class="person-avatar">{{ (item.nombre || item.email || "U").charAt(0).toUpperCase() }}</div>
            <div class="person-data"><strong>{{ item.nombre || "Sin nombre" }}</strong><span>{{ item.email }}</span></div>
            <BaseSelect :model-value="item.rol" :disabled="item.rol === 'administrador'" aria-label="Rol del usuario" @update:model-value="changeRole(item, $event)"><option value="lector">Lector</option><option value="administrador">Administrador</option></BaseSelect>
            <button v-if="item.rol !== 'administrador'" class="remove-button" type="button" :disabled="removing === item.id_usuario" @click="removeAccess(item)">Retirar</button>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import BaseButton from "../components/common/BaseButton.vue";
import BaseInput from "../components/common/BaseInput.vue";
import BaseSelect from "../components/common/BaseSelect.vue";
import { accesosApi } from "../services/accesosApi";
import { usePermissions } from "../composables/usePermissions";
import { usePredioStore } from "../stores/predioStore";

const predio = usePredioStore();
const { esAdministrador: isAdmin } = usePermissions();
const accesses = ref([]);
const loading = ref(false);
const saving = ref(false);
const removing = ref(null);
const email = ref("");
const role = ref("lector");
const message = ref("");
const messageTone = computed(() => (message.value.startsWith("No") ? "error" : "success"));

async function loadAccesses() {
  if (!predio.predioId.value || !isAdmin.value) return;
  loading.value = true;
  try { accesses.value = await accesosApi.list(predio.predioId.value); }
  catch (err) { message.value = err.message || "No se pudieron cargar los accesos."; }
  finally { loading.value = false; }
}
async function addAccess() {
  message.value = "";
  saving.value = true;
  try { await accesosApi.add(predio.predioId.value, { email: email.value.trim(), rol: role.value }); email.value = ""; message.value = "Usuario vinculado correctamente."; await loadAccesses(); }
  catch (err) { message.value = err.message || "No se pudo vincular el usuario."; }
  finally { saving.value = false; }
}
async function changeRole(item, nextRole) {
  if (nextRole === item.rol) return;
  try { const updated = await accesosApi.updateRole(predio.predioId.value, item.id_usuario, nextRole); Object.assign(item, updated); }
  catch (err) { message.value = err.message || "No se pudo actualizar el rol."; }
}
async function removeAccess(item) {
  if (!window.confirm(`¿Retirar el acceso de ${item.nombre || item.email}?`)) return;
  removing.value = item.id_usuario;
  try { await accesosApi.remove(predio.predioId.value, item.id_usuario); accesses.value = accesses.value.filter((access) => access.id_usuario !== item.id_usuario); }
  catch (err) { message.value = err.message || "No se pudo retirar el acceso."; }
  finally { removing.value = null; }
}
watch(() => [predio.predioId.value, isAdmin.value], loadAccesses, { immediate: true });
</script>

<style scoped>
.access-page { width: min(100%, 980px); margin: 0 auto; }
.page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
.eyebrow, .section-kicker { color: var(--color-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 6px 0; color: #eaf3ff; font-size: clamp(28px, 5vw, 38px); } .page-heading p, .add-card p { margin: 0; color: var(--color-muted); }
.role-badge { padding: 7px 11px; border-radius: 99px; font-size: 12px; font-weight: 800; text-transform: capitalize; } .role-admin { background: rgba(69,237,128,.12); color: var(--color-success); } .role-reader { background: var(--color-primary-soft); color: var(--color-primary); }
.add-card, .list-card { padding: 24px; margin-bottom: 18px; } h2 { margin: 6px 0; color: #e7f1ff; font-size: 20px; }
.add-form { display: grid; grid-template-columns: minmax(0, 1.4fr) 180px auto; align-items: end; gap: 12px; margin-top: 20px; } .add-form :deep(.btn) { min-height: 42px; }
.form-message { margin: 14px 0 0; font-size: 13px; } .form-message.success { color: var(--color-success); } .form-message.error { color: #ffb3bd; }
.section-title { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 17px; } .refresh { border: 0; background: transparent; color: var(--color-primary); font-weight: 700; cursor: pointer; } .refresh:disabled { opacity: .5; cursor: wait; }
.access-list { display: grid; gap: 9px; } .access-item { display: grid; grid-template-columns: auto minmax(0, 1fr) 170px auto; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); background: rgba(10,18,32,.28); }
.person-avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary-soft); color: var(--color-primary); font-weight: 800; } .person-data { min-width: 0; } .person-data strong, .person-data span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .person-data strong { color: #e7f1ff; } .person-data span { margin-top: 3px; color: var(--color-muted); font-size: 12px; }
.remove-button { border: 1px solid rgba(255,40,65,.4); border-radius: var(--radius-sm); padding: 8px 10px; background: transparent; color: #ffb3bd; font-size: 12px; font-weight: 700; cursor: pointer; } .remove-button:hover { background: rgba(255,40,65,.12); }
.state-card, .list-state { display: grid; gap: 6px; padding: 28px; color: var(--color-muted); } .restricted strong { color: #e7f1ff; } .list-state { border: 1px dashed var(--color-line); border-radius: var(--radius-sm); text-align: center; }
@media (max-width: 760px) { .page-heading { align-items: flex-start; flex-direction: column; } .add-form { grid-template-columns: 1fr; } .access-item { grid-template-columns: auto minmax(0, 1fr); } .access-item :deep(.field), .remove-button { grid-column: 2; } }
</style>
