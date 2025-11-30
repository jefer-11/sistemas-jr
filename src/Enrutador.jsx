import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { Map, Calculator, Save, AlertTriangle, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

// --- MATEMÁTICAS: FÓRMULA DE HAVERSINE ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function Enrutador() {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, [usuario]);

  async function cargarClientes() {
    setLoading(true);
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('orden_ruta', { ascending: true });
    
    setClientes(data || []);
    setLoading(false);
  }

  // --- LÓGICA MANUAL (FLECHAS) ---
  const moverFila = (index, direccion) => {
    const nuevos = [...clientes];
    const item = nuevos.splice(index, 1)[0]; 
    nuevos.splice(index + direccion, 0, item); 
    setClientes(nuevos);
  };

  // --- LÓGICA MANUAL (INPUT DIRECTO) ---
  const cambiarPosicionInput = (indiceActual, valorInput) => {
    const nuevaPosicion = parseInt(valorInput);
    if (isNaN(nuevaPosicion) || nuevaPosicion < 1) return; 
    if (nuevaPosicion > clientes.length) return; 
    
    const indiceDestino = nuevaPosicion - 1; 
    if (indiceActual === indiceDestino) return; 

    const nuevos = [...clientes];
    const [item] = nuevos.splice(indiceActual, 1);
    nuevos.splice(indiceDestino, 0, item);
    setClientes(nuevos);
  };

  // --- LÓGICA AUTOMÁTICA (IA) ---
  const enrutarAutomatico = () => {
    if (clientes.length < 2) return alert("Faltan clientes.");
    if (!window.confirm("🤖 ¿Optimizar ruta automáticamente desde el Cliente #1?")) return;

    const conGPS = clientes.filter(c => c.gps_latitud && c.gps_longitud);
    const sinGPS = clientes.filter(c => !c.gps_latitud || !c.gps_longitud);

    if (conGPS.length === 0) return alert("Sin GPS registrado.");

    let ruta = [conGPS[0]];
    let pendientes = conGPS.slice(1);

    while (pendientes.length > 0) {
      const ultimo = ruta[ruta.length - 1];
      let masCercano = null;
      let distMin = Infinity;
      let idx = -1;

      for (let i = 0; i < pendientes.length; i++) {
        const cand = pendientes[i];
        const dist = calcularDistancia(ultimo.gps_latitud, ultimo.gps_longitud, cand.gps_latitud, cand.gps_longitud);
        if (dist < distMin) { distMin = dist; masCercano = cand; idx = i; }
      }
      if (masCercano) { ruta.push(masCercano); pendientes.splice(idx, 1); }
    }
    setClientes([...ruta, ...sinGPS]);
    alert("✅ Ruta optimizada.");
  };

  // --- GUARDAR ---
  const guardarOrdenBD = async () => {
    setGuardando(true);
    try {
      const updates = clientes.map((c, i) => ({
        ...c, 
        empresa_id: usuario.empresa_id,
        orden_ruta: i + 1
      }));

      const { error } = await supabase.from('clientes').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      alert("✅ Orden guardado.");
      cargarClientes(); 
    } catch (error) { alert(error.message); } finally { setGuardando(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '50px' }}>
      
      <div style={{textAlign:'center', marginBottom:'20px'}}>
        <h2 style={{color:'#111827', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
          <Map color="#2563eb" /> Enrutador Logístico
        </h2>
        <p style={{color:'#6b7280', fontSize:'14px'}}>Organiza tu ruta manual o automáticamente</p>
      </div>

      <div style={{display:'flex', gap:'10px', marginBottom:'20px', backgroundColor:'white', padding:'15px', borderRadius:'12px', border:'1px solid #d1d5db', flexWrap:'wrap'}}>
        <button onClick={enrutarAutomatico} style={btnAuto}><Calculator size={18}/> Automático (IA)</button>
        <button onClick={guardarOrdenBD} disabled={guardando} style={btnGuardar}><Save size={18}/> {guardando ? 'Guardando...' : 'GUARDAR ORDEN'}</button>
      </div>

      <div style={{backgroundColor:'white', borderRadius:'12px', overflow:'hidden', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>
        <div style={{padding:'15px', background:'#f3f4f6', borderBottom:'1px solid #ddd', fontWeight:'bold', color:'#374151', display:'flex', justifyContent:'space-between'}}>
            <span style={{width:'85px', textAlign:'center'}}>Posición</span>
            <span style={{flex:1}}>Cliente</span>
            <span>Mover</span>
        </div>
        
        {loading ? <div style={{padding:'20px', textAlign:'center'}}>Cargando...</div> : (
          clientes.map((cliente, index) => (
            <div key={cliente.id} style={{display:'flex', alignItems:'center', padding:'10px 15px', borderBottom:'1px solid #eee', backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'}}>
              
              {/* CÍRCULO AZUL + INPUT + BOTÓN IR */}
              <div style={{marginRight:'15px', display:'flex', alignItems:'center', gap:'5px'}}>
                {/* 1. Indicador Visual */}
                <div style={{
                    width:'25px', height:'25px', borderRadius:'50%', 
                    backgroundColor:'#2563eb', color:'white', 
                    display:'flex', justifyContent:'center', alignItems:'center', 
                    fontWeight:'bold', fontSize:'11px'
                }}>
                  {index + 1}
                </div>

                {/* 2. Input Manual */}
                <input 
                    id={`pos-input-${index}`} // ID único para encontrarlo
                    type="number" 
                    defaultValue={index + 1}
                    style={{
                        width:'45px', padding:'5px', textAlign:'center', 
                        borderRadius:'6px', border:'1px solid #9ca3af',
                        fontWeight:'bold', color:'#374151', outline:'none'
                    }}
                />

                {/* 3. BOTÓN "IR" (SOLUCIÓN A TU PROBLEMA) */}
                <button 
                    onClick={() => {
                        const val = document.getElementById(`pos-input-${index}`).value;
                        cambiarPosicionInput(index, val);
                    }}
                    style={{
                        backgroundColor:'#e5e7eb', border:'1px solid #d1d5db', 
                        borderRadius:'6px', padding:'5px', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center'
                    }}
                    title="Mover aquí"
                >
                    <CornerDownLeft size={16} color="#374151"/>
                </button>
              </div>

              {/* CENTRO: DATOS CLIENTE */}
              <div style={{flex:1}}>
                <div style={{fontWeight:'bold', color:'#111827', fontSize:'15px'}}>{cliente.nombre_completo}</div>
                <div style={{fontSize:'12px', color:'#6b7280', display:'flex', alignItems:'center', gap:'5px'}}>
                   {cliente.gps_latitud ? <span style={{color:'#16a34a'}}>📍 Con GPS</span> : <span style={{color:'#dc2626'}}>⚠️ Sin GPS</span>}
                </div>
              </div>

              {/* FLECHAS */}
              <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                <button 
                    onClick={() => moverFila(index, -1)} 
                    disabled={index === 0}
                    style={{...btnFlecha, borderBottom:'none', borderRadius:'4px 4px 0 0'}}
                >
                    <ArrowUp size={16}/>
                </button>
                <button 
                    onClick={() => moverFila(index, 1)} 
                    disabled={index === clientes.length - 1}
                    style={{...btnFlecha, borderRadius:'0 0 4px 4px'}}
                >
                    <ArrowDown size={16}/>
                </button>
              </div>

            </div>
          ))
        )}
      </div>
      
      <div style={{marginTop:'20px', padding:'15px', backgroundColor:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'8px', color:'#9a3412', fontSize:'13px', display:'flex', gap:'10px'}}>
        <AlertTriangle size={20}/>
        <div>
            <strong>Instrucciones:</strong> Escribe el número en la casilla y presiona el botón <CornerDownLeft size={12} style={{display:'inline'}}/> para mover al cliente.
        </div>
      </div>

    </div>
  );
}

const btnAuto = { flex:1, backgroundColor:'#7c3aed', color:'white', border:'none', padding:'12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' };
const btnGuardar = { flex:1, backgroundColor:'#16a34a', color:'white', border:'none', padding:'12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' };
const btnFlecha = { backgroundColor:'#f3f4f6', border:'1px solid #d1d5db', cursor:'pointer', padding:'4px 8px', color:'#374151', display:'flex', alignItems:'center', justifyContent:'center' };