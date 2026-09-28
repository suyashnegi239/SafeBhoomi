
import React, { useState } from "react";

const emergencyContacts = [
  {
    number: "112",
    title: "Emergency Services",
    description: "Police, fire, ambulance and disaster emergency response",
    icon: "🚨",
    primary: true
  },
  {
    number: "108",
    title: "Emergency Ambulance",
    description: "24×7 emergency ambulance service in Uttarakhand",
    icon: "🚑"
  },
  {
    number: "1070",
    title: "State Emergency Operation Centre",
    description: "Uttarakhand State Emergency Operation Centre",
    icon: "🏛️"
  },
  {
    number: "1077",
    title: "District Emergency Operation Centre",
    description: "District-level disaster emergency coordination",
    icon: "📡"
  }
];

const safetySteps = [
  "Move away from unstable slopes, cliffs and falling-rock zones.",
  "Do not enter a road section marked as blocked or unsafe.",
  "Move to a safer open location if local authorities issue an evacuation warning.",
  "When calling emergency services, clearly provide your location and situation.",
  "Follow instructions from official emergency authorities."
];

export default function SafeBhoomiEmergency() {

  const [confirmCall, setConfirmCall] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState("Nainital");

  const makeCall = number => {
    setConfirmCall(number);
  };

  const proceedCall = () => {
    if (confirmCall) {
      window.location.href = `tel:${confirmCall}`;
    }
  };

  return (
    <div className="emergencyPage">

      <div className="emergencyHero">

        <div>

          <div className="emergencyEyebrow">
            SAFEBHOOMI • EMERGENCY CENTER
          </div>

          <h1>🚨 Emergency Assistance</h1>

          <p>
            Quick access to verified Uttarakhand emergency services
            and disaster-control contacts.
          </p>

        </div>

        <div className="emergencyPulse">
          <span></span>
          EMERGENCY CENTER READY
        </div>

      </div>

      <div className="emergencyWarning">

        <div className="warningIcon">
          !
        </div>

        <div>
          <strong>In immediate danger?</strong>

          <p>
            Call <b>112</b> for emergency services.
            For medical ambulance assistance, call <b>108</b>.
          </p>
        </div>

      </div>

      <div className="emergencyGrid">

        {emergencyContacts.map(contact => (

          <div
            key={contact.number}
            className={
              "emergencyCard " +
              (contact.primary ? "primaryEmergency" : "")
            }
          >

            <div className="emergencyCardIcon">
              {contact.icon}
            </div>

            <div className="emergencyNumber">
              {contact.number}
            </div>

            <h2>{contact.title}</h2>

            <p>{contact.description}</p>

            <button
              onClick={() => makeCall(contact.number)}
            >
              📞 Call {contact.number}
            </button>

          </div>

        ))}

      </div>

      <div className="districtEmergency">

        <div>

          <div className="sectionEyebrow">
            DISTRICT EMERGENCY CONTROL
          </div>

          <h2>District Emergency Operation Centre</h2>

          <p>
            Select a district to view its verified control-room
            contact information.
          </p>

        </div>

        <select
          value={selectedDistrict}
          onChange={e => setSelectedDistrict(e.target.value)}
        >

          <option>Nainital</option>
          <option>Almora</option>
          <option>Bageshwar</option>
          <option>Chamoli</option>
          <option>Champawat</option>
          <option>Dehradun</option>
          <option>Haridwar</option>
          <option>Pauri Garhwal</option>
          <option>Rudraprayag</option>
          <option>Tehri</option>
          <option>Uttarkashi</option>
          <option>Pithoragarh</option>
          <option>Udham Singh Nagar</option>

        </select>

        <div className="districtContact">

          <span>DEOC</span>

          <strong>1077</strong>

          <small>
            District Emergency Operation Centre
          </small>

          <button onClick={() => makeCall("1077")}>
            📞 Call District Emergency Centre
          </button>

        </div>

      </div>

      <div className="safetyPanel">

        <div className="sectionEyebrow">
          LANDSLIDE SAFETY
        </div>

        <h2>What to do during a landslide emergency</h2>

        <div className="safetySteps">

          {safetySteps.map((step, index) => (

            <div key={index} className="safetyStep">

              <span>{String(index + 1).padStart(2, "0")}</span>

              <p>{step}</p>

            </div>

          ))}

        </div>

      </div>

      <div className="emergencyOfficial">

        <strong>Official emergency information</strong>

        <p>
          Emergency numbers shown here are based on
          Uttarakhand government sources.
        </p>

      </div>

      {confirmCall && (

        <div className="callOverlay">

          <div className="callDialog">

            <div className="callIcon">
              📞
            </div>

            <h2>Call {confirmCall}?</h2>

            <p>
              This will open your device's phone
              calling interface.
            </p>

            <div className="callActions">

              <button
                className="cancelCall"
                onClick={() => setConfirmCall(null)}
              >
                Cancel
              </button>

              <button
                className="confirmCall"
                onClick={proceedCall}
              >
                Call Now
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
