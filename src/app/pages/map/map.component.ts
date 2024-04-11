import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Feature } from 'src/app/interface';
import { loteamiento } from 'src/assets/lotes/loteamiento';
import { google } from 'google-maps';
// import { MarkerClusterer, GridAlgorithm } from '@googlemaps/markerclusterer';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit{

  title = 'angular-google-maps';
  @ViewChild('map') mapElement: any;
  map!: google.maps.Map;
  marker!: google.maps.Marker;
  infoWindow!: google.maps.InfoWindow;
  markerLayer: google.maps.Data = new google.maps.Data();

  geoJsonFiles = [
    'manzana_A.geojson',
    'manzana_B.geojson',
    'manzana_D.geojson',
  ];

  constructor(private http: HttpClient) {
  }

  ngAfterViewInit(): void {

    window.onload = () => {

      const mapProperties = {
        center: new google.maps.LatLng(-25.215629900096722, -58.124656676498944),
        zoom: 16,
        mapTypeld: google.maps.MapTypeId.ROADMAP,
      };
  
      this.map = new google.maps.Map(
        this.mapElement.nativeElement,
        mapProperties
      );

  
      this.loadGeoJson();
  
      this.hiddenTags();

      this.loadMarkersFromJSON();

    }

  }

  loadMarkersFromJSON() {
    const res = this;
    const url = '/assets/pointsMarkers.json';
    this.markerLayer.loadGeoJson(
      url,
      { idPropertyName: 'lote' },
      (features) => {
        const markers = features.map(function (feature) {
          const g: any = feature.getGeometry();
          const icon = feature.getProperty('icon');

          const marker = new google.maps.Marker({
            position: g.get(0),
            icon: {
              url: icon,
              scaledSize: new google.maps.Size(15, 15),
            },
            map: res.map,
          });
          return marker;
        });
      }
    );
  }

  loadGeoJson() {
    this.geoJsonFiles.forEach((filename) => {
      // Cargar el archivo GeoJSON
      this.http.get<any>('assets/poligonos/' + filename).subscribe((data) => {
        const features = data.features;
        features.forEach((feature: Feature) => {
          
          const coordinates = feature.geometry.coordinates[0]; // Obtener las coordenadas del polígono
          const properties = feature.properties;

          const loteFound = loteamiento.find(
            (lote) => lote.lote == properties.lote
          );

          properties.id = loteFound!.id;
          properties.manzana = loteFound!.manzana;
          properties.estado = loteFound!.estado;

          coordinates.map((coordinate: any) => {
            const formattedCoordinates = this.convertToLatLng(coordinate);

            const polygon = new google.maps.Polygon({
              paths: formattedCoordinates,
              strokeColor: '#000000',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#2fdc2f',
              fillOpacity: 0.7,
              map: this.map,
            });

            let center = this.calculatePolygonCenter(formattedCoordinates);

            this.setColors(loteFound, polygon);

            this.listenersPolygon(polygon, loteFound?.estado!);

            polygon.addListener('click', (polygon) => {
              this.showInfoWindow(center, this.map, properties);
            });
          });
        });
      });
    });
  }

  setColors(loteFound:any, polygon: any) {
    if (loteFound?.estado == 'reservado') {
      polygon.setOptions({ fillColor: '#e82c2c' });
    } else if (loteFound?.estado == 'vendido') {
      polygon.setOptions({ fillColor: '#2c48e8' });
    }
  }

  hiddenTags() {
    // Eliminar las etiquetas del mapa
    this.map.set('styles', [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ]);
  }

  convertToLatLng(coordinates: number[][]): { lat: number; lng: number }[] {
    return coordinates.map((coord) => ({ lat: coord[1], lng: coord[0] }));
  }

  // Función para mostrar el InfoWindow en el centro del polígono
  showInfoWindow(
    position: google.maps.LatLng,
    map: any,
    properties: any
  ): void {
    this.closeInfoWindow();

    const estado = this.toTitleCase(properties.estado);

    let bgColor = estado === 'Reservado' ? 'bg-red-500' : estado === 'Vendido' ? 'bg-blue-500' : 'bg-green-500';

    this.infoWindow = new google.maps.InfoWindow({
      content: `<div class="bg-white shadow-md w-52 h-auto rounded-md p-2">
      <div class="text-white font-semibold p-1 ${bgColor}">${estado}</div>
      <div class="text-xl font-bold mb-2">Lote N°${properties.id}</div>
      <div class="text-gray-600">Manzana ${properties.manzana}</div>
    </div>`,
    });

    this.infoWindow.setPosition(position);
    this.infoWindow.open(map);
  }

  toTitleCase(str: string) {
    return str.toLowerCase().replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  // Función para cerrar el InfoWindow
  closeInfoWindow() {
    // Cierra el InfoWindow si está abierto
    if (this.infoWindow) {
      this.infoWindow.close();
    }
  }

  listenersPolygon(polygon: google.maps.Polygon, estado: string) {
    const colors: any = {
      disponible: { mouseover: '#097609', mouseout: '#2fdc2f' },
      reservado: { mouseover: '#da0808', mouseout: '#e82c2c' },
      otro: { mouseover: '#0828de', mouseout: '#2c48e8' }, // Agrega los colores para otros estados si es necesario
    };

    const color = colors[estado] || colors['otro'];

    polygon.addListener('mouseover', () => {
      polygon.setOptions({ fillColor: color.mouseover });
    });

    polygon.addListener('mouseout', () => {
      polygon.setOptions({ fillColor: color.mouseout });
    });
  }

  // Función para calcular el centro del polígono
  calculatePolygonCenter(coords: any[]): google.maps.LatLng {
    const bounds = new google.maps.LatLngBounds();
    coords.forEach((coord) => bounds.extend(coord));
    return bounds.getCenter();
  }

}
