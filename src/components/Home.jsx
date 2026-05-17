// Home.jsx - New homepage component based on csfgps.html
import { useState, useEffect } from 'preact/hooks'

export function Home({ onOpenChat }) {
  const [userLocation, setUserLocation] = useState(null)
  const [currentFilter, setCurrentFilter] = useState('0-3')
  const [allUsers, setAllUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showGPSIntro, setShowGPSIntro] = useState(true)
  const [showManualLocation, setShowManualLocation] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  // City coordinates database
  const cityCoordinates = {
    "New York": { lat: 40.7128, lng: -74.0060 },
    "London": { lat: 51.5074, lng: -0.1278 },
    "Tokyo": { lat: 35.6762, lng: 139.6503 },
    "Paris": { lat: 48.8566, lng: 2.3522 },
    "Sydney": { lat: -33.8688, lng: 151.2093 },
    "Dubai": { lat: 25.2048, lng: 55.2708 },
    "Los Angeles": { lat: 34.0522, lng: -118.2437 },
    "Chicago": { lat: 41.8781, lng: -87.6298 },
    "Miami": { lat: 25.7617, lng: -80.1918 },
    "Toronto": { lat: 43.6532, lng: -79.3832 },
    "Berlin": { lat: 52.5200, lng: 13.4050 },
    "Rome": { lat: 41.9028, lng: 12.4964 },
    "Madrid": { lat: 40.4168, lng: -3.7038 }
  }

  // Sample user data
  const sampleUsers = [
    { id: 1, name: "Sophia", age: 22, gender: "female", avatar: "https://i.pravatar.cc/300?img=1", bio: "Love traveling and photography. Looking for meaningful connections.", interests: ["Travel", "Photography", "Yoga", "Coffee"], online: true },
    { id: 2, name: "Alex", age: 28, gender: "male", avatar: "https://i.pravatar.cc/300?img=5", bio: "Software developer who loves hiking and coffee. Always up for an adventure!", interests: ["Hiking", "Tech", "Gaming", "Coffee"], online: true },
    { id: 3, name: "Emma", age: 24, gender: "female", avatar: "https://i.pravatar.cc/300?img=6", bio: "Art student passionate about painting and music. Let's explore together!", interests: ["Art", "Music", "Museums", "Reading"], online: false },
    { id: 4, name: "Michael", age: 32, gender: "male", avatar: "https://i.pravatar.cc/300?img=8", bio: "Fitness trainer and nutrition coach. Love helping people achieve their goals.", interests: ["Fitness", "Nutrition", "Sports", "Health"], online: true },
    { id: 5, name: "Olivia", age: 26, gender: "female", avatar: "https://i.pravatar.cc/300?img=9", bio: "Digital marketer who loves dogs and outdoor adventures. Coffee enthusiast!", interests: ["Dogs", "Outdoors", "Marketing", "Coffee"], online: true },
    { id: 6, name: "David", age: 30, gender: "male", avatar: "https://i.pravatar.cc/300?img=11", bio: "Chef who loves cooking Italian food and exploring local markets.", interests: ["Cooking", "Food", "Travel", "Wine"], online: false },
    { id: 7, name: "Isabella", age: 23, gender: "female", avatar: "https://i.pravatar.cc/300?img=12", bio: "Yoga instructor and wellness coach. Passionate about mindfulness.", interests: ["Yoga", "Meditation", "Wellness", "Nature"], online: true },
    { id: 8, name: "James", age: 35, gender: "male", avatar: "https://i.pravatar.cc/300?img=15", bio: "Architect who appreciates good design, art galleries, and city walks.", interests: ["Architecture", "Design", "Art", "Walking"], online: false }
  ]

  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation')
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation)
        setUserLocation(location)
        setShowGPSIntro(false)
        loadUsers(location)
      } catch (e) {
        setShowGPSIntro(true)
      }
    }
  }, [])

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const getDistanceCategory = (distance) => {
    if (distance <= 3) return 'near'
    if (distance <= 6) return 'mid'
    if (distance <= 9) return 'far'
    return 'very-far'
  }

  const getDistanceRingClass = (distance) => {
    const category = getDistanceCategory(distance)
    return `distance-${category}-ring`
  }

  const getDistanceText = (distance) => {
    if (distance < 1) return `${(distance * 1000).toFixed(0)}m`
    return `${distance.toFixed(1)}km`
  }

  const generateRandomCoordinates = (baseLat, baseLng, maxDistanceKm) => {
    const degreesPerKm = 0.009
    const randomDistance = Math.random() * maxDistanceKm
    const randomAngle = Math.random() * 2 * Math.PI
    
    const latOffset = (randomDistance * Math.cos(randomAngle)) * degreesPerKm
    const lngOffset = (randomDistance * Math.sin(randomAngle)) * degreesPerKm / Math.cos(baseLat * Math.PI / 180)
    
    return {
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset
    }
  }

  const getUserLocation = () => {
    setLoading(true)
    
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser")
      setShowManualLocation(true)
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps',
          timestamp: new Date().toISOString(),
          city: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
        }
        
        setUserLocation(location)
        localStorage.setItem('userLocation', JSON.stringify(location))
        setShowGPSIntro(false)
        loadUsers(location)
        setLoading(false)
      },
      (error) => {
        setLoading(false)
        setShowManualLocation(true)
        
        let message = "Could not get your location. "
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message += "Please allow location access or enter manually."
            break
          default:
            message += "Please enter your location manually."
        }
        alert(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const setManualLocation = (cityName) => {
    if (!cityName || !cityName.trim()) {
      alert("Please enter a city name")
      return
    }
    
    setLoading(true)
    
    const city = cityName.trim()
    const coordinates = cityCoordinates[city]
    
    if (coordinates) {
      const location = {
        lat: coordinates.lat,
        lng: coordinates.lng,
        city: city,
        source: 'manual',
        timestamp: new Date().toISOString()
      }
      
      setUserLocation(location)
      localStorage.setItem('userLocation', JSON.stringify(location))
      setShowGPSIntro(false)
      loadUsers(location)
    } else {
      const location = {
        lat: 40.7128,
        lng: -74.0060,
        city: city,
        source: 'manual',
        timestamp: new Date().toISOString()
      }
      
      setUserLocation(location)
      localStorage.setItem('userLocation', JSON.stringify(location))
      setShowGPSIntro(false)
      loadUsers(location)
    }
    
    setLoading(false)
  }

  const loadUsers = (location) => {
    if (!location) return
    
    setLoading(true)
    
    setTimeout(() => {
      const usersWithDistance = sampleUsers.map((user, index) => {
        const maxDistance = 20
        const coords = generateRandomCoordinates(location.lat, location.lng, maxDistance)
        
        const distance = calculateDistance(location.lat, location.lng, coords.lat, coords.lng)
        
        return {
          ...user,
          coordinates: coords,
          distance: distance,
          category: getDistanceCategory(distance)
        }
      })
      
      setAllUsers(usersWithDistance)
      applyFilters(usersWithDistance, currentFilter)
      setLoading(false)
    }, 800)
  }

  const applyFilters = (users, filter, genderFilter = 'all', ageFilter = 'all') => {
    let filtered = users.filter(user => {
      if (filter === 'all') return true
      
      const [min, max] = filter.includes('+') ? 
        [parseFloat(filter), Infinity] : 
        filter.split('-').map(Number)
      
      return user.distance >= min && user.distance <= (max === Infinity ? Infinity : max)
    })
    
    if (genderFilter !== 'all') {
      filtered = filtered.filter(user => user.gender === genderFilter)
    }
    
    if (ageFilter !== 'all') {
      const [minAge, maxAge] = ageFilter.includes('+') ? 
        [parseInt(ageFilter), Infinity] : 
        ageFilter.split('-').map(Number)
      
      filtered = filtered.filter(user => {
        if (maxAge === Infinity) return user.age >= minAge
        return user.age >= minAge && user.age <= maxAge
      })
    }
    
    filtered.sort((a, b) => a.distance - b.distance)
    setFilteredUsers(filtered)
  }

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter)
    const genderFilter = document.getElementById('genderFilter')?.value || 'all'
    const ageFilter = document.getElementById('ageFilter')?.value || 'all'
    applyFilters(allUsers, filter, genderFilter, ageFilter)
  }

  const handleGenderFilter = (e) => {
    const genderFilter = e.target.value
    const ageFilter = document.getElementById('ageFilter')?.value || 'all'
    applyFilters(allUsers, currentFilter, genderFilter, ageFilter)
  }

  const handleAgeFilter = (e) => {
    const ageFilter = e.target.value
    const genderFilter = document.getElementById('genderFilter')?.value || 'all'
    applyFilters(allUsers, currentFilter, genderFilter, ageFilter)
  }

  const handleSortDistance = () => {
    const sorted = [...filteredUsers].sort((a, b) => a.distance - b.distance)
    setFilteredUsers(sorted)
  }

  const refreshUsers = () => {
    if (userLocation) {
      loadUsers(userLocation)
    }
  }

  const openChatWithUser = (user) => {
    if (onOpenChat) {
      onOpenChat(user)
    }
  }

  // GPS Intro Screen
  if (showGPSIntro) {
    return (
      <div class="gps-intro active" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0f0f1a',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '60px', color: '#ff4081', marginBottom: '15px', animation: 'pulse 2s infinite' }}>
          <i class="fas fa-map-marker-alt"></i>
        </div>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', color: '#f5f5f5' }}>Find Nearby Connections</h1>
        <p style={{ color: '#8a8a9c', marginBottom: '20px', maxWidth: '400px', lineHeight: '1.5', fontSize: '14px' }}>
          See people around you sorted by distance. Connect with those nearby!
        </p>
        
        <button onClick={getUserLocation} style={{
          background: '#ff4081',
          color: 'white',
          border: 'none',
          padding: '12px 30px',
          borderRadius: '25px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s'
        }}>
          <i class="fas fa-location-dot"></i>
          Use My Location
        </button>
        
        <div style={{ marginTop: '15px', color: '#8a8a9c', fontSize: '12px' }}>
          <button onClick={() => setShowManualLocation(!showManualLocation)} style={{
            background: 'none',
            border: 'none',
            color: '#ff4081',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            <i class="fas fa-map-pin"></i> Choose different city
          </button>
        </div>

        {showManualLocation && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '10px', color: '#f5f5f5', fontSize: '16px' }}>Or choose a city:</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input 
                type="text" 
                placeholder="Enter city name"
                value={cityInput}
                onInput={(e) => setCityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setManualLocation(cityInput)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #8a8a9c',
                  background: '#1a1a2e',
                  color: '#f5f5f5',
                  fontSize: '14px'
                }}
              />
              <button onClick={() => setManualLocation(cityInput)} style={{
                background: '#7c4dff',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}>Go</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {Object.keys(cityCoordinates).slice(0, 8).map(city => (
                <button key={city} onClick={() => setManualLocation(city)} style={{
                  background: '#1a1a2e',
                  color: '#f5f5f5',
                  border: '1px solid #8a8a9c',
                  padding: '6px 12px',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.3s'
                }}>
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main App
  return (
    <div style={{ background: '#0f0f1a', minHeight: '100vh', color: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        background: '#1a1a2e',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: '700', color: '#ff4081' }}>
              <i class="fas fa-heart"></i>
              <span>Nearby</span>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              cursor: 'pointer'
            }} onClick={() => {
              setShowGPSIntro(true)
              setShowManualLocation(false)
            }}>
              <i class="fas fa-map-marker-alt" style={{ color: '#ff4081' }}></i>
              <div>
                <div>{userLocation?.city || 'Selected Location'}</div>
                <div style={{ fontSize: '11px', color: '#4caf50' }}>
                  <i class="fas fa-circle" style={{ fontSize: '8px' }}></i> {userLocation?.source === 'gps' ? 'GPS Active' : 'Manual Location'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 15px' }}>
        {/* Distance Categories */}
        <div style={{
          display: 'flex',
          gap: '8px',
          margin: '15px 0',
          padding: '0 10px',
          overflowX: 'auto',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {[
            { value: '0-3', label: '0-3km', icon: 'fa-walking' },
            { value: '3-6', label: '3-6km', icon: 'fa-bicycle' },
            { value: '6-9', label: '6-9km', icon: 'fa-car' },
            { value: '9+', label: '9+ km', icon: 'fa-globe' },
            { value: 'all', label: 'All', icon: 'fa-users' }
          ].map(cat => (
            <button
              key={cat.value}
              onClick={() => handleFilterChange(cat.value)}
              style={{
                padding: '6px 15px',
                borderRadius: '20px',
                background: currentFilter === cat.value ? '#ff4081' : '#1a1a2e',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                border: currentFilter === cat.value ? '2px solid #ff4081' : '2px solid transparent',
                color: currentFilter === cat.value ? 'white' : '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i class={`fas ${cat.icon}`}></i> {cat.label}
            </button>
          ))}
        </div>

        {/* Distance Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          margin: '10px 0',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          flexWrap: 'wrap'
        }}>
          {[
            { color: '#4caf50', label: 'Near (0-3km)' },
            { color: '#ff9800', label: 'Mid (3-6km)' },
            { color: '#ff4081', label: 'Far (6-9km)' },
            { color: '#7c4dff', label: '9+ km' }
          ].map(legend => (
            <div key={legend.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#8a8a9c' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: legend.color }}></div>
              <span>{legend.label}</span>
            </div>
          ))}
        </div>

        {/* Filter Controls */}
        <div style={{
          display: 'flex',
          gap: '10px',
          margin: '15px 10px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <select id="genderFilter" onChange={handleGenderFilter} style={{
            background: '#1a1a2e',
            color: '#f5f5f5',
            border: '1px solid #8a8a9c',
            padding: '8px 12px',
            borderRadius: '8px',
            minWidth: '120px',
            fontSize: '13px'
          }}>
            <option value="all">Genders</option>
            <option value="female">Women</option>
            <option value="male">Men</option>
          </select>
          
          <select id="ageFilter" onChange={handleAgeFilter} style={{
            background: '#1a1a2e',
            color: '#f5f5f5',
            border: '1px solid #8a8a9c',
            padding: '8px 12px',
            borderRadius: '8px',
            minWidth: '120px',
            fontSize: '13px'
          }}>
            <option value="all">Ages</option>
            <option value="18-25">18-25</option>
            <option value="26-35">26-35</option>
            <option value="36+">36+</option>
          </select>
          
          <button onClick={handleSortDistance} style={{
            background: '#1a1a2e',
            color: '#f5f5f5',
            border: '1px solid #8a8a9c',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '13px',
            transition: 'all 0.3s'
          }}>
            <i class="fas fa-sort-amount-down"></i> Distance
          </button>
          
          <button onClick={refreshUsers} style={{
            background: '#ff4081',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '13px'
          }}>
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #8a8a9c',
              borderTop: '4px solid #ff4081',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <p>Finding people near you...</p>
          </div>
        )}

        {/* Users Grid */}
        {!loading && (
          <>
            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8a8a9c' }}>
                <i class="fas fa-users-slash" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>No users found</h3>
                <p>Try changing your distance filter or refresh.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '15px',
                padding: '0 10px',
                marginBottom: '20px'
              }}>
                {filteredUsers.map(user => {
                  const distanceText = getDistanceText(user.distance)
                  const ringClass = getDistanceRingClass(user.distance)
                  const genderIcon = user.gender === 'female' ? '♀' : '♂'
                  const genderColor = user.gender === 'female' ? '#ff4081' : '#7c4dff'
                  
                  let ringColor = ''
                  if (ringClass.includes('near')) ringColor = '#4caf50'
                  else if (ringClass.includes('mid')) ringColor = '#ff9800'
                  else if (ringClass.includes('far')) ringColor = '#ff4081'
                  else ringColor = '#7c4dff'
                  
                  return (
                    <div
                      key={user.id}
                      onClick={() => openChatWithUser(user)}
                      style={{
                        background: 'transparent',
                        borderRadius: '50%',
                        overflow: 'visible',
                        transition: 'all 0.3s',
                        position: 'relative',
                        cursor: 'pointer',
                        width: '100%',
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{
                        position: 'relative',
                        width: '90%',
                        height: '90%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `3px solid ${ringColor}`,
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s'
                      }}>
                        <img src={user.avatar} alt={user.name} style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s'
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: '5px',
                          left: '5px',
                          background: `rgba(0, 0, 0, 0.7)`,
                          color: genderColor,
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          zIndex: 2
                        }}>{genderIcon}</div>
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          width: '12px',
                          height: '12px',
                          background: user.online ? '#4caf50' : '#8a8a9c',
                          borderRadius: '50%',
                          border: '2px solid #1a1a2e',
                          zIndex: 2
                        }}></div>
                        <div style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: ringColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          zIndex: 3
                        }}>{distanceText}</div>
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '8px', width: '100%' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '2px',
                          color: '#f5f5f5',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: '#8a8a9c', marginBottom: '4px' }}>{user.age} years</div>
                        <div style={{
                          fontSize: '10px',
                          color: '#ff4081',
                          background: 'rgba(255, 64, 129, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'inline-block'
                        }}>{distanceText} away</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <div style={{
          display: 'flex',
          gap: '10px',
          margin: '10px',
          padding: '10px',
          background: '#1a1a2e',
          borderRadius: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { icon: 'fa-heart', label: 'Likes', action: () => alert('Showing your likes...') },
            { icon: 'fa-fire', label: 'Matches', action: () => alert('Showing matches...') },
            { icon: 'fa-map-marker-alt', label: 'Near Me', action: () => handleFilterChange('0-3') },
            { icon: 'fa-circle', label: 'Online', action: () => alert('Showing online users...') }
          ].map(action => (
            <div key={action.label} onClick={action.action} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '10px',
              transition: 'all 0.3s',
              minWidth: '70px'
            }}>
              <i class={`fas ${action.icon}`} style={{ fontSize: '20px', color: '#ff4081' }}></i>
              <span style={{ fontSize: '11px', color: '#8a8a9c' }}>{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1a1a2e',
        padding: '8px 15px',
        display: 'flex',
        justifyContent: 'space-around',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100
      }}>
        {[
          { page: 'explore', icon: 'fa-compass', label: 'Explore', active: true },
          { page: 'likes', icon: 'fa-heart', label: 'Likes', action: () => alert('Likes page coming soon') },
          { page: 'chat', icon: 'fa-comment', label: 'Chat', action: () => alert('Open chat from user cards') },
          { page: 'profile', icon: 'fa-user', label: 'Me', action: () => alert('Profile page coming soon') }
        ].map(nav => (
          <button key={nav.page} onClick={nav.action || (() => {})} style={{
            background: 'none',
            border: 'none',
            color: nav.active ? '#ff4081' : '#8a8a9c',
            padding: '6px',
            cursor: 'pointer',
            textAlign: 'center',
            flex: 1,
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px'
          }}>
            <i class={`fas ${nav.icon}`} style={{ fontSize: '18px' }}></i>
            <span style={{ fontSize: '10px' }}>{nav.label}</span>
          </button>
        ))}
      </div>

      {/* Scroll to top button */}
      <button id="scrollTop" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{
        position: 'fixed',
        bottom: '70px',
        right: '15px',
        background: '#ff4081',
        color: 'white',
        border: 'none',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        zIndex: 99,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
      }}>
        <i class="fas fa-chevron-up"></i>
      </button>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}