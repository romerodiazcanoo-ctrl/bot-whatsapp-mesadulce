export default function AyudaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Guía rápida de uso</h1>
        <p className="mt-1 text-sm text-stone-500">
          Todo lo que necesitás para usar el sistema en el día a día de la planta.
        </p>
      </div>

      <Seccion titulo="1. ¿Qué es cada tipo de stock?">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Stock crudo</strong>: masa ya formada en unidades, todavía sin hornear (cookies clásicas y rellenas).</li>
          <li><strong>Stock horneado/congelado</strong>: solo para cookies rellenas — ya horneadas y congeladas, listas para decorar.</li>
          <li><strong>Stock de brownies</strong>: se maneja en porciones individuales; 1 plancha = 12 porciones.</li>
        </ul>
      </Seccion>

      <Seccion titulo="2. Cargar o corregir el stock real">
        <p>
          Andá a <strong>Stock</strong>. Ahí vas a ver cada variedad con su cantidad actual. Para
          corregirla (por ejemplo después de un conteo físico), escribí la nueva cantidad total —
          no hace falta calcular la diferencia, el sistema la calcula solo — y tocá{" "}
          <strong>Ajustar</strong>. Podés dejar una nota con el motivo.
        </p>
        <p className="mt-2">
          Cuando una cookie rellena ya salió del horno y se congeló, usá el botón{" "}
          <strong>Registrar horneado → congelado</strong> para pasar esas unidades de crudo a
          horneado/congelado.
        </p>
      </Seccion>

      <Seccion titulo="3. Cargar producción (rendimiento automático)">
        <p>
          Andá a <strong>Cargar producción</strong>, elegí la variedad e ingresá el{" "}
          <strong>peso total de masa producida</strong> en gramos. El sistema calcula
          automáticamente cuántas unidades salen (peso ÷ peso unitario de esa variedad: 120 g para
          rellenas, 40 g para clásicas) y lo suma directo al stock crudo.
        </p>
        <p className="mt-2">
          Para brownies, en cambio, cargá directamente las <strong>porciones sueltas</strong> y/o{" "}
          <strong>planchas</strong> producidas (1 plancha = 12 porciones).
        </p>
      </Seccion>

      <Seccion titulo="4. Cargar el plan de producción">
        <p>
          Andá a <strong>Plan de producción</strong> y cargá cuántas unidades hay que producir de
          cada variedad. Al activarlo, reemplaza al plan anterior (que queda guardado en
          históricos).
        </p>
      </Seccion>

      <Seccion titulo="5. Cómo leer los resultados">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Falta producir</strong>: cuánto le falta al stock crudo para cubrir el plan.</li>
          <li><strong>Disponible para hornear</strong>: cuánto del stock crudo actual ya se puede llevar al horno.</li>
          <li><strong>Disponible para decorar</strong>: stock horneado/congelado de cookies rellenas, listo para la etapa de decorado.</li>
        </ul>
        <p className="mt-2">
          El <strong>Panel</strong> principal muestra todo esto de un vistazo, con alertas en rojo
          cuando falta producir algo del plan activo.
        </p>
      </Seccion>

      <Seccion titulo="6. Accesos y dispositivos">
        <p>
          El administrador otorga el acceso a cada cuenta de Gmail desde{" "}
          <strong>Usuarios</strong>. La primera vez que alguien inicia sesión, el sistema vincula
          su cuenta a ese dispositivo. Si esa persona intenta entrar desde otro dispositivo, el
          acceso queda bloqueado hasta que el administrador lo reautorice desde esa misma pantalla.
        </p>
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="mb-2 font-semibold text-stone-900">{titulo}</h2>
      <div className="text-sm leading-relaxed text-stone-600">{children}</div>
    </section>
  );
}
