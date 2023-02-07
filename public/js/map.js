(function () {
  const [d] = arguments;
  var p = {
    map: null,
    circleList: [],
    infoWindow: null,
    init: () => {
      p.map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 36.19227794422354, lng: 36.15596012406974 },
        zoom: 13,
        styles: [
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [
              {
                color: "#ffffff",
              },
            ],
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [
              {
                color: "#000000",
              },
              {
                lightness: 13,
              },
            ],
          },
          {
            featureType: "administrative",
            elementType: "geometry.fill",
            stylers: [
              {
                color: "#000000",
              },
            ],
          },
          {
            featureType: "administrative",
            elementType: "geometry.stroke",
            stylers: [
              {
                color: "#144b53",
              },
              {
                lightness: 14,
              },
              {
                weight: 1.4,
              },
            ],
          },
          {
            featureType: "landscape",
            elementType: "all",
            stylers: [
              {
                color: "#08304b",
              },
            ],
          },
          {
            featureType: "poi",
            elementType: "all",
            stylers: [
              {
                visibility: "off",
              },
            ],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.fill",
            stylers: [
              {
                color: "#000000",
              },
            ],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [
              {
                color: "#0b434f",
              },
              {
                lightness: 25,
              },
            ],
          },
          {
            featureType: "road.arterial",
            elementType: "geometry.fill",
            stylers: [
              {
                color: "#000000",
              },
            ],
          },
          {
            featureType: "road.arterial",
            elementType: "geometry.stroke",
            stylers: [
              {
                color: "#0b3d51",
              },
              {
                lightness: 16,
              },
            ],
          },

          {
            featureType: "road.local",
            elementType: "geometry",
            stylers: [
              {
                color: "#000000",
              },
            ],
          },
          {
            featureType: "transit",
            elementType: "all",
            stylers: [
              {
                color: "#146474",
              },
            ],
          },
          {
            featureType: "water",
            elementType: "all",
            stylers: [
              {
                color: "#021019",
              },
            ],
          },
        ],
        overlayMapTypes: [],
        mapTypeControl: false,
        streetViewControl: false,

        // disableDefaultUI: true
      });
      p.map.addListener("dragend", p.events.center_changed);
      p.helpers.getData();
    },
    events: {
      center_changed: () => {
        p.helpers.getData();
      },
      data_received: async (resp) => {
        let data;

        for (; (data = p.circleList.pop()); ) {
          data.circle.setMap(null);
        }

        let result = await resp.json();
        result.records.forEach((i) => p.helpers.setMarkers(i));
      },
      circle_click: (circlePoint) => {
        let pointData = p.circleList.find(
          (i) =>
            i.point.lat == circlePoint.lat && i.point.lng == circlePoint.lng
        );
        p.helpers.setInfoWindow(pointData);
      },
    },
    helpers: {
      setInfoWindow: (data) => {
        console.log(data);
        if (p.infoWindow) p.infoWindow.setMap(null);

        const { fields } = data.data;
        console.log(fields);
        let fieldList = Object.keys(fields).map((i) => {
          return `<b>${i} : </b>${fields[i]}`;
        });

        p.infoWindow = new google.maps.InfoWindow({
          content: `<div style='color:#000;text-align:left'>
                                ${fieldList.join("<br>")}
                            </div>`,
          position: data.point,
          visible: true,
          map: p.map,
        });
      },
      getData: () => {
        let center = p.map.getCenter();
        center = { lat: center.lat(), lng: center.lng() };
        console.log(center);
        fetch(
          `https://depremharitasi.org/data.json?lat=${center.lat}&long=${center.lng}`
        ).then(p.events.data_received);
      },
      setMarkers: (data) => {
        const [latStr, lngStr] = data.fields.Konum.split(", ");
        const point = { lat: +latStr, lng: +lngStr };

        const circle = new google.maps.Circle({
          clickable: true,
          strokeColor: "#F00",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#F00",
          fillOpacity: 0.35,
          map: p.map,
          center: point,
          radius: 100,
        });

        circle.addListener("click", p.events.circle_click.bind(null, point));

        p.circleList.push({
          circle,
          data,
          point,
        });
      },
    },
  };
  p.init();
})(document);
