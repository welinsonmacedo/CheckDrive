import { useState, useEffect } from "react";

interface Props {
  latitude?: string | number | null;
  longitude?: string | number | null;
  fallback?: string;
  className?: string;
}

export default function AddressFromCoordinates({
  latitude,
  longitude,
  fallback,
  className,
}: Props) {
  const [address, setAddress] = useState<string>(fallback || "Carregando...");

  useEffect(() => {
    if (!latitude || !longitude) {
      if (fallback) setAddress(fallback);
      else setAddress("Localização desconhecida");
      return;
    }

    const fetchAddress = async () => {
      try {
        const lat = String(latitude).trim();
        const lon = String(longitude).trim();

        let addressFound = false;

        if (!addressFound) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
              {
                headers: {
                  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                },
              },
            );
            if (response.ok) {
              const data = await response.json();
              if (data) {
                // Prioritize place name (amenity, shop, etc) if available
                const placeName =
                  data.name ||
                  (data.address &&
                    (data.address.amenity ||
                      data.address.shop ||
                      data.address.building ||
                      data.address.office ||
                      data.address.leisure ||
                      data.address.commercial ||
                      data.address.tourism ||
                      data.address.highway));

                if (
                  placeName &&
                  placeName !== data.address?.road &&
                  placeName !== data.address?.suburb
                ) {
                  setAddress(placeName);
                  addressFound = true;
                } else if (data.address) {
                  const addressParts = [];
                  if (data.address.road) addressParts.push(data.address.road);
                  if (data.address.suburb)
                    addressParts.push(data.address.suburb);
                  if (
                    data.address.city ||
                    data.address.town ||
                    data.address.village ||
                    data.address.municipality
                  ) {
                    addressParts.push(
                      data.address.city ||
                        data.address.town ||
                        data.address.village ||
                        data.address.municipality,
                    );
                  }

                  if (addressParts.length > 0) {
                    setAddress(addressParts.join(", "));
                    addressFound = true;
                  } else if (data.display_name) {
                    setAddress(data.display_name.split(",")[0]);
                    addressFound = true;
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Nominatim failed, trying BigDataCloud...", e);
          }
        }

        if (!addressFound) {
          try {
            const bdcResponse = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
            );
            if (bdcResponse.ok) {
              const bdcData = await bdcResponse.json();
              if (bdcData.city || bdcData.locality) {
                const loc = [
                  bdcData.locality,
                  bdcData.city,
                  bdcData.principalSubdivision,
                ].filter(Boolean);
                // removes duplicates
                const uniqueLoc = Array.from(new Set(loc));
                setAddress(uniqueLoc.join(" - "));
                addressFound = true;
              }
            }
          } catch (bdcError) {
            console.warn("BigDataCloud failed:", bdcError);
          }
        }

        if (!addressFound) {
          if (fallback) setAddress(fallback);
          else setAddress(`${lat}, ${lon}`);
        }
      } catch (error) {
        if (fallback) setAddress(fallback);
        else
          setAddress(`${String(latitude).trim()}, ${String(longitude).trim()}`);
      }
    };

    fetchAddress();
  }, [latitude, longitude, fallback]);

  return (
    <span
      title={address}
      className={`truncate block max-w-[200px] ${className || ""}`}
    >
      {address}
    </span>
  );
}
