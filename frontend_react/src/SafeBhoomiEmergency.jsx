
import React from "react";
import {
  Phone,
  ShieldAlert,
  Ambulance,
  Flame,
  Radio,
  MapPin,
  Building2,
  Siren
} from "lucide-react";

const contacts = [
  {
    number: "112",
    title: "Integrated Emergency Services",
    description: "Police, fire, ambulance and disaster-related emergency assistance.",
    icon: Siren,
    type: "Emergency"
  },
  {
    number: "108",
    title: "Ambulance",
    description: "24/7 emergency medical response service in Uttarakhand.",
    icon: Ambulance,
    type: "Medical"
  },
  {
    number: "1070",
    title: "State Emergency Operation Centre",
    description: "State-level disaster emergency coordination and assistance.",
    icon: Radio,
    type: "Disaster"
  },
  {
    number: "1077",
    title: "District Emergency Operation Centre",
    description: "District-level disaster response and emergency coordination.",
    icon: MapPin,
    type: "District"
  },
  {
    number: "0135-2710334",
    title: "SEOC Landline",
    description: "Uttarakhand State Emergency Operation Centre.",
    icon: Building2,
    type: "SEOC"
  },
  {
    number: "0135-2710335",
    title: "SEOC Landline",
    description: "Additional State Emergency Operation Centre contact.",
    icon: Building2,
    type: "SEOC"
  },
  {
    number: "0135-2664314",
    title: "SEOC Landline",
    description: "Additional emergency coordination line.",
    icon: Radio,
    type: "SEOC"
  },
  {
    number: "0135-2664315",
    title: "SEOC Landline",
    description: "Additional emergency coordination line.",
    icon: Radio,
    type: "SEOC"
  },
  {
    number: "0135-2664316",
    title: "SEOC Landline",
    description: "Additional emergency coordination line.",
    icon: Radio,
    type: "SEOC"
  },
  {
    number: "0135-2664317",
    title: "USDMA Reception",
    description: "Uttarakhand State Disaster Management Authority reception.",
    icon: Building2,
    type: "USDMA"
  }
];

function EmergencyCard({ item }) {
  const Icon = item.icon;

  const phoneNumber = item.number.replace(/[^0-9+]/g, "");

  return (
    <div className="emergencyContactCard">
      <div className="emergencyContactIcon">
        <Icon size={24} />
      </div>

      <div className="emergencyContactInfo">
        <div className="emergencyContactType">{item.type}</div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>

      <a
        className="emergencyCallButton"
        href={`tel:${phoneNumber}`}
        aria-label={`Call ${item.title} at ${item.number}`}
      >
        <Phone size={17} />
        <strong>{item.number}</strong>
      </a>
    </div>
  );
}

export function SafeBhoomiEmergency() {
  return (
    <div className="emergencyPage">

      <div className="emergencyHero">
        <div className="emergencyHeroIcon">
          <ShieldAlert size={34} />
        </div>

        <div>
          <div className="emergencyEyebrow">
            SAFEBHOOMI EMERGENCY CENTER
          </div>

          <h1>Emergency Contacts</h1>

          <p>
            Quick access to emergency, medical and disaster-response
            contacts for Uttarakhand.
          </p>
        </div>
      </div>

      <div className="emergencyNotice">
        <Siren size={20} />
        <div>
          <strong>If you are in immediate danger</strong>
          <span>
            Use the appropriate emergency service below. For an
            integrated emergency response, call 112.
          </span>
        </div>
      </div>

      <div className="emergencyGrid">
        {contacts.map((item) => (
          <EmergencyCard
            key={`${item.number}-${item.title}`}
            item={item}
          />
        ))}
      </div>

      <section className="emergencySafetyPanel">
        <div className="emergencySafetyHeader">
          <ShieldAlert size={21} />
          <div>
            <h2>During a Landslide Emergency</h2>
            <p>Use SafeBhoomi as an information aid, not as a replacement for official emergency instructions.</p>
          </div>
        </div>

        <div className="emergencySafetyGrid">
          <div>
            <strong>01</strong>
            <span>Move away from active landslide zones when it is safe to do so.</span>
          </div>

          <div>
            <strong>02</strong>
            <span>Follow instructions from local authorities and emergency responders.</span>
          </div>

          <div>
            <strong>03</strong>
            <span>Do not approach blocked roads, unstable slopes or damaged structures.</span>
          </div>

          <div>
            <strong>04</strong>
            <span>When calling for help, clearly provide your location and the nature of the emergency.</span>
          </div>
        </div>
      </section>

      <div className="emergencyFooterNote">
        <span>DATA SOURCE</span>
        <p>
          Emergency contact information is based on Uttarakhand State
          Disaster Management Authority and Uttarakhand Government
          information.
        </p>
      </div>

    </div>
  );
}

export default SafeBhoomiEmergency;
