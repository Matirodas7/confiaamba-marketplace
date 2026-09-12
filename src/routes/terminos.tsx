import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones | ConfiaAMBA" },
      {
        name: "description",
        content: "Términos y condiciones de uso de la plataforma ConfiaAMBA.",
      },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Términos y Condiciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: [COMPLETAR: fecha de publicación]
        </p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-display text-xl font-bold text-foreground">1. Quiénes somos y qué es ConfiaAMBA</h2>
            <p className="mt-2">
              ConfiaAMBA es una plataforma operada por{" "}
              <strong>[COMPLETAR: razón social], CUIT [COMPLETAR], con domicilio en [COMPLETAR]</strong>{" "}
              ("ConfiaAMBA", "la Plataforma", "nosotros"), que conecta a personas que necesitan
              contratar un servicio para el hogar u oficina en Ciudad Autónoma de Buenos Aires y
              Gran Buenos Aires ("Clientes") con prestadores independientes de esos servicios
              ("Profesionales"). Al crear una cuenta o usar la Plataforma, aceptás estos Términos
              y Condiciones y nuestra{" "}
              <Link to="/privacidad" className="text-primary underline underline-offset-2">
                Política de Privacidad
              </Link>
              . Si no estás de acuerdo, no debés usar ConfiaAMBA.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">2. Qué es y qué NO es ConfiaAMBA</h2>
            <p className="mt-2">
              ConfiaAMBA es un intermediario tecnológico: publicamos pedidos de servicio,
              facilitamos el intercambio de presupuestos y mensajes entre Cliente y Profesional, y
              ofrecemos herramientas de verificación y reputación. <strong>ConfiaAMBA no presta los
              servicios contratados, no emplea a los Profesionales, no es parte del acuerdo comercial
              entre Cliente y Profesional, y no garantiza el resultado, la calidad, los tiempos ni
              el precio final de ningún trabajo.</strong> El contrato de prestación de servicios se
              celebra exclusivamente entre Cliente y Profesional, quienes actúan de forma
              independiente y bajo su propia responsabilidad.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">3. Registro de cuenta</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Para usar ConfiaAMBA tenés que ser mayor de 18 años y tener capacidad legal para contratar.</li>
              <li>
                Sos responsable de la veracidad de los datos que cargás (nombre, DNI, domicilio,
                teléfono) y de mantenerlos actualizados. Datos falsos o de un tercero sin su
                consentimiento pueden derivar en la suspensión inmediata de la cuenta.
              </li>
              <li>Sos responsable de la confidencialidad de tus credenciales de acceso y de toda actividad realizada desde tu cuenta.</li>
              <li>Podés tener un único perfil por persona. No se permiten cuentas duplicadas ni suplantación de identidad.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">4. Verificación de identidad de Profesionales</h2>
            <p className="mt-2">
              Para operar como Profesional en ConfiaAMBA pedimos una foto del documento de
              identidad y una selfie de verificación ("KYC"). Este proceso confirma que la
              identidad declarada coincide con la documentación presentada, pero{" "}
              <strong>
                no constituye una verificación de antecedentes penales, comerciales ni de
                idoneidad técnica o matrícula profesional
              </strong>
              , salvo que se indique expresamente lo contrario para una categoría puntual. La
              insignia "Verificado" indica únicamente que pasó el control de identidad descripto.
              ConfiaAMBA puede rechazar, suspender o dar de baja una verificación en cualquier
              momento a su sola discreción, y puede solicitar nueva documentación si detecta
              inconsistencias.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">5. Cómo funciona: pedidos, presupuestos y contratación</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>El Cliente publica un pedido describiendo el trabajo, su categoría y zona.</li>
              <li>Profesionales de esa categoría y zona (o el Profesional elegido directamente) pueden enviar un presupuesto.</li>
              <li>El Cliente elige libremente si acepta un presupuesto, con qué Profesional y en qué condiciones. ConfiaAMBA no interviene en esa decisión ni la garantiza.</li>
              <li>Publicar un pedido o enviar un presupuesto no genera obligación de contratar ni de ser contratado.</li>
              <li>Cliente y Profesional pueden coordinar detalles por el chat interno de la Plataforma. Recomendamos mantener ahí la comunicación relevante al trabajo.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">6. Pagos y comisión de la Plataforma</h2>
            <p className="mt-2">
              El pago por el trabajo realizado se acuerda y se efectiviza{" "}
              <strong>directamente entre Cliente y Profesional</strong>, por el medio que ambos
              elijan; ConfiaAMBA no procesa ni retiene ese pago. Cuando un trabajo se marca como
              finalizado y cobrado a través de la Plataforma, ConfiaAMBA cobra al Profesional una{" "}
              <strong>comisión sobre el valor final del trabajo</strong>, cuyo porcentaje puede
              variar según la categoría de servicio y se informa en el panel del Profesional antes
              de confirmar cada presupuesto. La falta de pago de la comisión adeudada puede derivar
              en la suspensión de la cuenta del Profesional. [COMPLETAR: forma de facturación y
              cobro de la comisión al Profesional — transferencia, descuento en planes, etc.]
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">7. Reseñas y calificaciones</h2>
            <p className="mt-2">
              Al finalizar un trabajo, el Cliente puede calificar al Profesional con estrellas y
              un comentario. Las reseñas deben reflejar una experiencia real vivida con ese
              Profesional a través de la Plataforma. Nos reservamos el derecho de ocultar reseñas
              que incumplan la ley, contengan datos personales de terceros, lenguaje agraviante,
              o que detectemos como falsas o manipuladas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">8. Conducta prohibida</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Usar la Plataforma para fines ilícitos, fraudulentos o para eludir el cobro de la comisión.</li>
              <li>Publicar contenido falso, difamatorio, discriminatorio o que infrinja derechos de terceros.</li>
              <li>Contactar a otro usuario fuera de la Plataforma con el único fin de evitar la comisión antes de que se cierre un trabajo iniciado en ConfiaAMBA.</li>
              <li>Intentar acceder sin autorización a cuentas, datos o sistemas de ConfiaAMBA o de otros usuarios.</li>
              <li>Suplantar identidad, cargar documentación falsa o de terceros.</li>
            </ul>
            <p className="mt-2">
              El incumplimiento de cualquiera de estos puntos puede derivar en la suspensión o
              baja definitiva de la cuenta, sin perjuicio de las acciones legales que correspondan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">9. Limitación de responsabilidad</h2>
            <p className="mt-2">
              En la máxima medida permitida por la ley, ConfiaAMBA no es responsable por daños,
              perjuicios, pérdidas o reclamos derivados de: (a) la calidad, seguridad, legalidad o
              resultado del trabajo prestado por un Profesional; (b) el incumplimiento de acuerdos
              entre Cliente y Profesional; (c) información falsa o inexacta cargada por un usuario;
              (d) interrupciones o fallas técnicas de la Plataforma. Cualquier disputa sobre la
              ejecución del trabajo o el pago debe resolverse entre Cliente y Profesional; ConfiaAMBA
              puede, a su criterio, colaborar como mediador informativo pero no está obligada a
              hacerlo ni a garantizar un resultado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">10. Suspensión y baja de cuentas</h2>
            <p className="mt-2">
              Podemos suspender o dar de baja una cuenta, con o sin previo aviso, ante
              incumplimiento de estos Términos, sospecha de fraude, uso indebido de la Plataforma
              o requerimiento de una autoridad competente. El usuario puede solicitar la baja de su
              cuenta en cualquier momento desde su perfil o escribiendo a [COMPLETAR: email de contacto].
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">11. Modificaciones</h2>
            <p className="mt-2">
              Podemos actualizar estos Términos para reflejar cambios en la Plataforma o en la
              normativa aplicable. Ante cambios relevantes lo vamos a comunicar dentro de la
              Plataforma. El uso continuado después de la publicación de los cambios implica su
              aceptación.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">12. Ley aplicable y jurisdicción</h2>
            <p className="mt-2">
              Estos Términos se rigen por las leyes de la República Argentina. Para cualquier
              controversia, las partes se someten a la jurisdicción de los tribunales ordinarios
              con competencia en la Ciudad Autónoma de Buenos Aires, sin perjuicio de las normas de
              protección al consumidor que resulten aplicables al Cliente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground">13. Contacto</h2>
            <p className="mt-2">
              Consultas sobre estos Términos: [COMPLETAR: email de contacto].
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
