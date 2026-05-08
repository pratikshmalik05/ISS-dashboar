import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { calculateDistance, calculateSpeed } from '../utils/haversine';
import toast from 'react-hot-toast';

export interface ISSPosition {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
}

export const useISS = () => {
  const [positions, setPositions] = useState<ISSPosition[]>([]);
  const [astros, setAstros] = useState<{ name: string; craft: string }[]>([]);
  const [locationName, setLocationName] = useState<string>('Loading...');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAstros = async () => {
    try {
      const res = await axios.get('http://api.open-notify.org/astros.json');
      setAstros(res.data.people);
    } catch (error) {
      console.error('Error fetching astros:', error);
    }
  };

  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      if (res.data && res.data.display_name) {
        const parts = res.data.display_name.split(', ');
        setLocationName(parts.slice(-3).join(', '));
      } else {
        setLocationName('Over the Ocean');
      }
    } catch (error) {
      setLocationName('Over the Ocean');
    }
  };

  const fetchISS = useCallback(async () => {
    try {
      const res = await axios.get('http://api.open-notify.org/iss-now.json');
      const lat = parseFloat(res.data.iss_position.latitude);
      const lng = parseFloat(res.data.iss_position.longitude);
      const timestamp = res.data.timestamp;

      setPositions((prev) => {
        let speed = 27600; // Default approximate ISS speed
        if (prev.length > 0) {
          const lastPos = prev[prev.length - 1];
          const dist = calculateDistance(lastPos.lat, lastPos.lng, lat, lng);
          const timeDiff = timestamp - lastPos.timestamp; // in seconds
          if (timeDiff > 0) {
            speed = calculateSpeed(dist, timeDiff);
          } else {
            speed = lastPos.speed;
          }
        }

        const newPos = { lat, lng, timestamp, speed };
        const newPositions = [...prev, newPos];
        // Keep only the last 30 positions
        if (newPositions.length > 30) {
          newPositions.shift();
        }
        return newPositions;
      });

      fetchLocationName(lat, lng);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch ISS location.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAstros();
    fetchISS();
    const interval = setInterval(fetchISS, 15000);
    return () => clearInterval(interval);
  }, [fetchISS]);

  return {
    currentPosition: positions.length > 0 ? positions[positions.length - 1] : null,
    positions,
    astros,
    locationName,
    loading,
    refreshISS: fetchISS,
  };
};
