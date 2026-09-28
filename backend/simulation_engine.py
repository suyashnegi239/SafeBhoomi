
from copy import deepcopy

DEFAULT_STATE = {
    "mode": "Normal Monsoon",

    "environment": {
        "rainfall": 35,
        "temperature": 18,
        "humidity": 65,
    },

    "zones": {},

    "roads": {
        "NH-7": "OPEN",
        "NH-109": "OPEN",
        "NH-125": "OPEN",
        "Mountain Corridor A": "OPEN",
    },

    "alerts": [],

    "last_event": None,
}


class SimulationEngine:

    def __init__(self):
        self.state = deepcopy(DEFAULT_STATE)

    def initialize(self, zones):
        self.state = deepcopy(DEFAULT_STATE)
        self.state["zones"] = zones
        return self.state

    def apply_event(self, event_type):

        event = event_type.lower().strip()

        self.state["last_event"] = event_type

        if event in ["heavy rain", "heavy_rain"]:
            self.state["mode"] = "Heavy Rain"

            self.state["environment"]["rainfall"] = 100
            self.state["environment"]["humidity"] = 85

            self.state["alerts"] = [
                {
                    "title": "Heavy Rainfall",
                    "severity": "HIGH",
                    "location": "Uttarakhand",
                    "message":
                        "Rainfall conditions have increased "
                        "environmental slope risk."
                }
            ]

            self.state["roads"]["NH-7"] = "CAUTION"

        elif event in [
            "extreme rainfall",
            "extreme_rainfall"
        ]:
            self.state["mode"] = "Extreme Rainfall"

            self.state["environment"]["rainfall"] = 150
            self.state["environment"]["humidity"] = 95

            self.state["alerts"] = [
                {
                    "title": "Extreme Rainfall",
                    "severity": "CRITICAL",
                    "location": "Uttarakhand",
                    "message":
                        "Extreme precipitation is producing "
                        "rapidly increasing environmental risk."
                }
            ]

            self.state["roads"]["NH-7"] = "BLOCKED"
            self.state["roads"]["NH-109"] = "CAUTION"

        elif event in [
            "landslide",
            "landslide event"
        ]:
            self.state["mode"] = "Landslide Event"

            self.state["environment"]["rainfall"] = 120

            self.state["alerts"] = [
                {
                    "title": "Landslide Event",
                    "severity": "CRITICAL",
                    "location": "Mountain Corridor",
                    "message":
                        "A simulated landslide has affected "
                        "a monitored corridor."
                }
            ]

            self.state["roads"]["NH-7"] = "BLOCKED"

        elif event in [
            "road blockage",
            "road_blockage"
        ]:
            self.state["mode"] = "Road Blockage"

            self.state["alerts"] = [
                {
                    "title": "Road Blockage",
                    "severity": "HIGH",
                    "location": "Mountain Corridor",
                    "message":
                        "A simulated road obstruction requires "
                        "route reassessment."
                }
            ]

            self.state["roads"]["NH-109"] = "BLOCKED"

        elif event in [
            "multiple hazards",
            "multiple_hazards"
        ]:
            self.state["mode"] = "Multiple Hazards"

            self.state["environment"]["rainfall"] = 150
            self.state["environment"]["humidity"] = 95

            self.state["alerts"] = [
                {
                    "title": "Multiple Hazard Scenario",
                    "severity": "CRITICAL",
                    "location": "Uttarakhand",
                    "message":
                        "Multiple simulated hazards are "
                        "affecting the monitored network."
                }
            ]

            self.state["roads"]["NH-7"] = "BLOCKED"
            self.state["roads"]["NH-109"] = "BLOCKED"
            self.state["roads"]["NH-125"] = "CAUTION"

        else:
            self.state["mode"] = "Normal Monsoon"

            self.state["environment"] = {
                "rainfall": 35,
                "temperature": 18,
                "humidity": 65,
            }

            self.state["alerts"] = []

            for road in self.state["roads"]:
                self.state["roads"][road] = "OPEN"

        return self.state

    def get_state(self):
        return self.state
