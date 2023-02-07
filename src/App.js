import React, { useState, useEffect } from "react";
import GoogleMapReact from "google-map-react";
import mapStyles from "./mapStyles";

const AnyReactComponent = ({ text }) => <div className="marker">{text}</div>;

const App = () => {
  const defaultProps = {
    center: {
      lat: 36.19227794422354,
      lng: 36.15596012406974,
    },
    zoom: 11,
  };

  return (
    <div className="depremharitasi">
      <figcaption>
        <img
          src="/images/depremharitasi.svg"
          alt="depremharitasi"
          width={120}
        />
      </figcaption>

      <div>
        <h1>Deprem Haritası</h1>
        <div>
          <ul class="menu">
            <li>
              <a href="/index.html">Anasayfa</a>
            </li>
            <li>
              <a href="/harita.html">Harita</a>
            </li>
            <li>
              <a href="/data.json" target="_blank">
                API (JSON) 🔗
              </a>
            </li>
            <li>
              <a target="_blank" href="https://airtable.com/shrRPT8eUwDBTR9V6">
                Airtable Görünüm 🔗
              </a>
            </li>
            <li>
              <a href="https://t.me/+50CjJep6mLViMWI0" target="_blank">
                Telegram 🔗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <main>
        <section style={{ height: "50vh", width: "100%" }}>
          <GoogleMapReact
            bootstrapURLKeys={{
              key: "AIzaSyA7pB6adt-ET8e7kidoNkNhAQEerxYVg4s",
            }}
            defaultCenter={defaultProps.center}
            defaultZoom={defaultProps.zoom}
            language="tr"
            region="tr"
            heatmapLibrary={true}
            options={{
              styles: mapStyles,
            }}
          >
            <AnyReactComponent
              lat={36.19227794422354}
              lng={36.15596012406974}
              text="My Marker"
            />
            <AnyReactComponent
              lat={36.13227794422354}
              lng={36.13596012406974}
              text="My Marker"
            />
          </GoogleMapReact>
        </section>
      </main>

      <footer>
        <p>
          <a
            href="https://github.com/depremharitasi/depremharitasi.org"
            target="_blank"
          >
            github
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
