import React, { useState, useEffect } from "react";
import { usePosition } from "./usePosition";

const stateDefault = {};

const App = () => {
  const [state, setState] = useState(stateDefault);

  const { latitude, longitude, error } = usePosition();

  // load data from local storage
  useEffect(() => {
    let stateLocal = JSON.parse(localStorage.getItem("state") || "{}");
    if (stateLocal) {
      setState(stateLocal);
    }

    // const newState = { ...stateLocal };
    // setState(newState);
    // localStorage.setItem("state", JSON.stringify(newState));
  }, []);

  return (
    <div className="depremharitasi">
      <figcaption>
        <img
          src="/images/depremharitasi.svg"
          alt="depremharitasi"
          width={120}
        />
      </figcaption>

      <code>
        latitude: {latitude}
        <br />
        longitude: {longitude}
        <br />
        error: {error}
      </code>

      <main>
        <section>#map will be here</section>
      </main>

      <footer>
        <p>
          <a href="https://depremharitasi.org" target="_blank">
            depremharitasi.org
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
