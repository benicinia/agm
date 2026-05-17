export class VINDecoder {
    decodeVIN(vin) {
        if (!vin || vin.length !== 17) return {};
        
        const vinData = {
            vinNumber: vin,
            wmi: vin.substring(0, 3),
            vds: vin.substring(3, 9),
            vis: vin.substring(9, 17),
            modelYear: this.decodeVINModelYear(vin),
            assemblyPlant: this.decodeVINPlant(vin),
            manufacturer: this.decodeVINManufacturer(vin),
            vehicleType: this.decodeVINVehicleType(vin),
            modelCode: this.decodeVINModelCode(vin),
            modelName: this.decodeVINModelName(vin),
            engineInfo: this.decodeVINEngine(vin),
            bodyStyle: this.decodeVINBodyStyle(vin)
        };
        
        console.log('🔍 VIN Decoded:', vinData);
        return vinData;
    }

    decodeVINModelYear(vin) {
        const yearChar = vin.charAt(9);
        const yearMap = {
            'A': '2010', 'B': '2011', 'C': '2012', 'D': '2013', 'E': '2014', 'F': '2015',
            'G': '2016', 'H': '2017', 'J': '2018', 'K': '2019', 'L': '2020', 'M': '2021',
            'N': '2022', 'P': '2023', 'R': '2024', 'S': '2025', 'T': '2026', 'V': '2027',
            'W': '2028', 'X': '2029', 'Y': '2030',
            '1': '2001', '2': '2002', '3': '2003', '4': '2004', '5': '2005', '6': '2006',
            '7': '2007', '8': '2008', '9': '2009'
        };
        return yearMap[yearChar] || 'Unknown';
    }

    decodeVINPlant(vin) {
        const plantChar = vin.charAt(10);
        const wmi = vin.substring(0, 3);
        
        if (wmi.startsWith('L')) {
            const chinaPlantMap = {
                'A': 'Beijing', 'B': 'Shanghai', 'C': 'Guangzhou', 'D': 'Shenzhen',
                'E': 'Tianjin', 'F': 'Wuhan', 'G': 'Chongqing', 'H': 'Nanjing',
                'J': 'Chengdu', 'K': 'Xi\'an', 'L': 'Hangzhou', 'M': 'Suzhou',
                'N': 'Dongguan', 'P': 'Foshan', 'R': 'Qingdao', 'S': 'Zhengzhou',
                'T': 'Changsha', 'U': 'Ningbo', 'V': 'Hefei', 'W': 'Xiamen',
                'X': 'Wuxi', 'Y': 'Jinan', 'Z': 'Dalian'
            };
            return chinaPlantMap[plantChar] ? `China - ${chinaPlantMap[plantChar]}` : 'China - Unknown Plant';
        }
        
        const plantMap = {
            'A': 'USA - Indiana', 'B': 'USA - Ohio', 'C': 'Canada - Ontario',
            'D': 'Germany', 'E': 'USA - Kentucky', 'F': 'USA - Michigan',
            'G': 'USA - Tennessee', 'H': 'USA - Missouri', 'J': 'Japan',
            'K': 'Korea', 'L': 'China', 'M': 'Thailand',
            'N': 'USA - Indiana', 'P': 'USA - Illinois', 'R': 'Mexico',
            'S': 'USA - California', 'T': 'USA - Texas', 'U': 'USA - Ohio',
            'V': 'USA - Wisconsin', 'W': 'Germany', 'X': 'USA - Tennessee',
            'Y': 'USA - Michigan', 'Z': 'USA - Michigan'
        };
        return plantMap[plantChar] || 'Unknown Plant';
    }

    decodeVINManufacturer(vin) {
        const wmi = vin.substring(0, 3);
        const manufacturerMap = {
            'LBE': 'Beijing Automotive (BAW)', 'LB3': 'Dongfeng Motor', 'LDC': 'Dongfeng Peugeot-Citroen',
            'LDD': 'Dongfeng Nissan', 'LDY': 'Zhongtong Bus', 'LE4': 'Beijing Benz (Mercedes-Benz)',
            'LFM': 'FAW Toyota', 'LFN': 'FAW-Volkswagen', 'LFP': 'FAW Car', 'LFT': 'FAW Jiefang',
            'LFV': 'FAW-Volkswagen', 'LGB': 'Dongfeng Nissan', 'LGH': 'GAC Honda', 'LGJ': 'Dongfeng Honda',
            'LGW': 'Great Wall Motors', 'LGX': 'BYD Auto', 'LH1': 'FAW Haima', 'LHG': 'GAC Honda',
            'LJD': 'Dongfeng Peugeot-Citroen', 'LJN': 'Zhengzhou Nissan', 'LLV': 'Lifan Motors',
            'LMG': 'GAC Motor', 'LPA': 'Changan PSA', 'LRB': 'Beijing Benz (Mercedes-Benz)',
            'LS5': 'Changan Suzuki', 'LSG': 'SAIC General Motors', 'LSJ': 'SAIC MG',
            'LSV': 'SAIC Volkswagen', 'LSY': 'Brilliance Jinbei', 'LTV': 'FAW Toyota',
            'LUC': 'Guangqi Honda', 'LUD': 'Dongfeng Yueda Kia', 'LUX': 'Dongfeng Yulon',
            'LVB': 'Foton Motor', 'LVC': 'Beijing Benz (Mercedes-Benz)', 'LVD': 'Changan Ford',
            'LVS': 'FAW Toyota', 'LVV': 'Chery Automobile', 'LVY': 'Volvo China',
            'LZW': 'SAIC-GM-Wuling', 'LZY': 'Yutong Bus',
            'JA3': 'Mitsubishi', 'JA4': 'Mitsubishi', 'JA7': 'Mitsubishi', 'JAA': 'Isuzu',
            'JAB': 'Isuzu', 'JAC': 'Isuzu', 'JAE': 'Acura', 'JAL': 'Isuzu', 'JB3': 'Dodge',
            'JB4': 'Dodge', 'JB7': 'Dodge', 'JBA': 'Hino', 'JBB': 'Hino', 'JBC': 'Hino',
            'KMH': 'Hyundai', 'KNA': 'Kia', 'KNB': 'Kia', 'KNC': 'Kia', 'KND': 'Kia',
            'WAA': 'Audi', 'WBA': 'BMW', 'WDB': 'Mercedes-Benz', 'WVW': 'Volkswagen',
            '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford', '1FD': 'Ford', '1FM': 'Ford',
            '1FT': 'Ford', '1FU': 'Freightliner', '1FV': 'Freightliner', '1G1': 'Chevrolet',
            '1G2': 'Pontiac', '1G3': 'Oldsmobile', '1G4': 'Buick', '1G6': 'Cadillac',
            '1G8': 'Chevrolet', '1GA': 'Chevrolet', '1GB': 'Chevrolet', '1GC': 'Chevrolet',
            '1GD': 'GMC', '1GE': 'Cadillac'
        };
        
        return manufacturerMap[wmi] || this.guessManufacturerFromWMI(wmi);
    }

    guessManufacturerFromWMI(wmi) {
        if (wmi.startsWith('1')) return 'USA Manufacturer';
        if (wmi.startsWith('2')) return 'Canada Manufacturer';
        if (wmi.startsWith('3')) return 'Mexico Manufacturer';
        if (wmi.startsWith('J')) return 'Japan Manufacturer';
        if (wmi.startsWith('K')) return 'Korea Manufacturer';
        if (wmi.startsWith('L')) return 'China Manufacturer';
        if (wmi.startsWith('W')) return 'Germany Manufacturer';
        if (wmi.startsWith('Z')) return 'Italy Manufacturer';
        if (wmi.startsWith('V')) return 'France Manufacturer';
        if (wmi.startsWith('S')) return 'UK Manufacturer';
        if (wmi.startsWith('Y')) return 'Sweden Manufacturer';
        if (wmi.startsWith('MA') || wmi.startsWith('MB') || wmi.startsWith('MC') || wmi.startsWith('MD') || wmi.startsWith('ME')) return 'India Manufacturer';
        return 'Unknown Manufacturer';
    }

    decodeVINModelCode(vin) {
        const vds = vin.substring(3, 9);
        return vds.substring(0, 4);
    }

    decodeVINModelName(vin) {
        const manufacturer = this.decodeVINManufacturer(vin);
        const modelCode = this.decodeVINModelCode(vin);
        const wmi = vin.substring(0, 3);
        
        const modelDatabase = {
            'LVB': {
                'S6PE': 'Foton Aumark S6',
                'S6PB': 'Foton Aumark T3',
                'T4PA': 'Foton Ollin',
                'U3PC': 'Foton View',
                'S5PD': 'Foton Sup',
                'R7PF': 'Foton Tornado'
            },
            'LVS': {
                'A2PJ': 'FAW Jiefang J6',
                'B3PK': 'FAW Jiefang J7'
            },
            'LVV': {
                'C4PL': 'Chery Tiggo 7',
                'D5PM': 'Chery Arrizo 8'
            },
            'LGB': {
                'E6PN': 'Dongfeng K-series',
                'F7PP': 'Dongfeng Warrior'
            },
            'JT1': {
                'FJ8': 'Toyota Hilux',
                'GD6': 'Toyota Land Cruiser'
            },
            'KMH': {
                'HH6': 'Hyundai Porter',
                'HH7': 'Hyundai Mighty'
            }
        };
        
        return modelDatabase[wmi]?.[modelCode] || `${manufacturer} ${modelCode} Series`;
    }

    decodeVINEngine(vin) {
        const engineChar = vin.charAt(6);
        const engineMap = {
            'P': '2.8L Diesel Turbo',
            'Q': '3.0L Diesel Turbo', 
            'R': '3.8L Diesel Turbo',
            'S': '4.5L Diesel Turbo',
            'T': '5.2L Diesel Turbo',
            'E': 'Electric Drive',
            'H': 'Hybrid System'
        };
        return engineMap[engineChar] || 'Standard Engine';
    }

    decodeVINBodyStyle(vin) {
        const bodyChar = vin.charAt(4);
        const bodyMap = {
            '6': 'Crew Cab Truck',
            '3': 'Double Cab Truck',
            '4': 'Chassis Cab', 
            '5': 'Stake Body Truck',
            '7': 'Dump Truck',
            '8': 'Tanker Truck',
            '2': 'Extended Cab'
        };
        return bodyMap[bodyChar] || 'Commercial Truck';
    }

    decodeVINVehicleType(vin) {
        const vds = vin.substring(3, 8);
        
        if (vds.match(/[A-Z]{2}5[A-Z0-9]{2}/)) return 'SUV/4x4';
        if (vds.match(/[A-Z]{2}4[A-Z0-9]{2}/)) return 'MPV/Minivan';
        if (vds.match(/[A-Z]{2}3[A-Z0-9]{2}/)) return 'Passenger Car';
        if (vds.match(/[A-Z]{2}1[A-Z0-9]{2}/)) return 'Truck';
        if (vds.match(/[A-Z]{2}2[A-Z0-9]{2}/)) return 'Bus';
        if (vds.match(/[A-Z]{2}7[A-Z0-9]{2}/)) return 'Crossover';
        if (vds.match(/[A-Z]{2}8[A-Z0-9]{2}/)) return 'Commercial Vehicle';
        
        return 'Unknown Vehicle Type';
    }

    async decodeVINWithAPI(vin) {
        try {
            const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
            const data = await response.json();
            
            if (data.Results && data.Results.length > 0) {
                return this.parseNHTSAData(data.Results);
            }
        } catch (error) {
            console.error('NHTSA API error:', error);
            return this.decodeVIN(vin);
        }
    }

    parseNHTSAData(results) {
        const vinData = {};
        
        results.forEach(item => {
            switch(item.Variable) {
                case 'Make':
                    vinData.manufacturer = item.Value;
                    break;
                case 'Model':
                    vinData.modelName = item.Value;
                    break;
                case 'Model Year':
                    vinData.modelYear = item.Value;
                    break;
                case 'Vehicle Type':
                    vinData.vehicleType = item.Value;
                    break;
                case 'Body Class':
                    vinData.bodyStyle = item.Value;
                    break;
                case 'Engine Model':
                    vinData.engineInfo = item.Value;
                    break;
            }
        });
        
        return vinData;
    }
}