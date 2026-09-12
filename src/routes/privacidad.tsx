import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad | ConfiaAMBA" },
      {
        name: "description",
        content: "Cómo ConfiaAMBA recolecta, usa y protege tus datos personales.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: [COMPLETAR: fecha de publicación]
        </p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-display text-xl font-bold text-foreground">1. Responsable del tratamiento</h2>
            <p className="mt-2">
              El responsable del tratamiento de tus datos personales es{" "}
              <strong>[COMPLETAR: razón social], CUIT [COMPLETAR], con domicilio en [COMPLETAR]</strong>{" "}
              ("ConfiaAMBA"). Esta Política se rige por la Ley 25.326 de Protección de los Datos
              Personales de la República Argentina y sus normas complementarias, bajo control de la
              Agencia de Acceso a la Información Pública (AAIP).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">2. Qué datos recolectamos</h2>
            <p className="mt-2">Según cómo uses ConfiaAMBA, podemos recolectar:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Datos de cuenta:</strong> nombre, apellido, email, teléfono, contraseña (almacenada de forma cifrada, nunca en texto plano).</li>
              <li><strong>Datos de identidad (KYC), solo para verificación opcional o de Profesionales:</strong> número de DNI, foto del documento y selfie de verificación.</li>
              <li><strong>Datos de domicilio:</strong> calle, número, piso y departamento, cuando los cargás para la verificación o el envío del Profesional.</li>
              <li><strong>Datos de perfil profesional:</strong> categorías de servicio, zona de trabajo, tarifas, certificados, fotos de trabajos anteriores.</li>
              <li><strong>Contenido generado por vos:</strong> pedidos publicados, presupuestos, mensajes del chat interno, reseñas y calificaciones.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, páginas visitadas, registrados con fines de seguridad y funcionamiento del sitio.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">3. Para qué usamos tus datos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Crear y administrar tu cuenta, y autenticarte de forma segura.</li>
              <li>Verificar la identidad de los Profesionales (control KYC) y mostrar la insignia "Verificado".</li>
              <li>Conectar pedidos de Clientes con Profesionales de la categoría y zona correspondiente.</li>
              <li>Habilitar el chat interno entre Cliente y Profesional dentro de un pedido.</li>
              <li>Enviar notificaciones sobre tus pedidos, presupuestos y mensajes (dentro de la Plataforma y por email).</li>
              <li>Calcular y facturar la comisión de la Plataforma sobre trabajos finalizados.</li>
              <li>Prevenir fraude, suplantación de identidad y uso indebido de la Plataforma.</li>
              <li>Cumplir obligaciones legales y responder requerimientos de autoridades competentes.</li>
            </ul>
            <p className="mt-2">
              No usamos tus datos de verificación (DNI, selfie, documento) con fines publicitarios
              ni los vendemos a terceros bajo ninguna circunstancia.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">4. Con quién compartimos tus datos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Otros usuarios de la Plataforma:</strong> tu nombre, foto de perfil, zona y
                (si sos Profesional) tu perfil público, reseñas y calificación son visibles para
                otros usuarios como parte del funcionamiento del marketplace. Tu DNI, domicilio
                completo, foto de documento y selfie de verificación{" "}
                <strong>no se muestran públicamente</strong>; solo se usan internamente para el
                proceso de verificación.
              </li>
              <li>
                <strong>Proveedores de infraestructura y servicios:</strong> usamos proveedores
                externos (por ejemplo, hosting y base de datos) para operar la Plataforma. Estos
                proveedores acceden a los datos únicamente en la medida necesaria para prestar su
                servicio y bajo obligaciones de confidencialidad.
              </li>
              <li>
                <strong>Autoridades:</strong> cuando la ley lo exige o ante un requerimiento judicial válido.
              </li>
            </ul>
            <p className="mt-2">
              Parte de nuestra infraestructura puede alojarse en servidores fuera de la Argentina.
              Al usar ConfiaAMBA aceptás esta transferencia internacional de datos, que realizamos
              únicamente hacia proveedores que ofrecen garantías adecuadas de protección de datos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">5. Cuánto tiempo guardamos tus datos</h2>
            <p className="mt-2">
              Conservamos tus datos mientras tu cuenta esté activa y por el plazo adicional
              necesario para cumplir obligaciones legales, contables o para resolver disputas
              (por ejemplo, historial de pedidos y comisiones). Si solicitás la baja de tu cuenta,
              eliminamos o anonimizamos los datos que ya no sean necesarios, salvo aquellos que
              debamos conservar por obligación legal.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">6. Seguridad</h2>
            <p className="mt-2">
              Aplicamos medidas técnicas y organizativas razonables para proteger tus datos,
              incluyendo cifrado de contraseñas, control de acceso a la base de datos y conexión
              cifrada (HTTPS) en toda la Plataforma. Ningún sistema es 100% infalible; si
              detectamos un incidente de seguridad que afecte tus datos personales, te lo
              notificaremos conforme a la normativa vigente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">7. Tus derechos (ARCO)</h2>
            <p className="mt-2">
              Como titular de tus datos, tenés derecho a acceder, rectificar, actualizar y
              solicitar la supresión de tus datos personales, así como a revocar el consentimiento
              prestado, de acuerdo con el artículo 14 de la Ley 25.326. Podés ejercer estos
              derechos escribiendo a [COMPLETAR: email de contacto] o desde la sección "Mi perfil"
              de la Plataforma. La Agencia de Acceso a la Información Pública, en su carácter de
              Órgano de Control de la Ley 25.326, tiene la atribución de atender las denuncias y
              reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento
              de las normas vigentes en materia de protección de datos personales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">8. Cookies y almacenamiento local</h2>
            <p className="mt-2">
              Usamos almacenamiento local del navegador (localStorage) para mantener tu sesión
              iniciada y mejorar tu experiencia de uso. No usamos cookies de terceros con fines
              publicitarios. Podés eliminar estos datos borrando el almacenamiento local de tu
              navegador, aunque eso puede cerrar tu sesión.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">9. Menores de edad</h2>
            <p className="mt-2">
              ConfiaAMBA no está dirigida a menores de 18 años y no recolectamos intencionalmente
              datos de menores. Si detectamos una cuenta creada por un menor, procederemos a darla de baja.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">10. Cambios a esta Política</h2>
            <p className="mt-2">
              Podemos actualizar esta Política de Privacidad para reflejar cambios en la
              Plataforma o en la normativa aplicable. Ante cambios relevantes en cómo tratamos tus
              datos, te lo vamos a notificar dentro de la Plataforma antes de que entren en vigencia.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">11. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre esta Política o para ejercer tus derechos como titular de
              datos: [COMPLETAR: email de contacto].
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
