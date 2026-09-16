import ContactForm from "./ContactForm";
export const metadata = { title: "Kontakt oss" };

export default function ContactPage() {
  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 640 }}>
      <h1>Kontakt oss</h1>
      <p className="muted">
        Vi svarer normalt innen én virkedag. Gjelder det oppsigelse, kan du gjøre det selv på Min side med én gang.
      </p>
      <div className="card">
        <ContactForm />
      </div>
      <div className="card">
        <h3>Andre måter å nå oss på</h3>
        <dl className="spec">
          <dt>E-post</dt><dd>support@bilfunn.no</dd>
          <dt>Fakturaspørsmål</dt><dd>faktura@bilfunn.no</dd>
          <dt>Personvern</dt><dd>personvern@bilfunn.no</dd>
          <dt>Post</dt><dd>Bilfunn AS, Storgata 1, 0155 Oslo</dd>
        </dl>
      </div>
    </div>
  );
}
