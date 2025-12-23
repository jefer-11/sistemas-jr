// src/datosPrueba.js
export const datosPrueba = {
  empresas: [
    { id: 'emp-001', nombre_empresa: 'CREDITOS RAPIDOS S.A.S', estado: true, plan_suscripcion: 'PREMIUM', fecha_vencimiento: '2030-12-31' }
  ],
  usuarios: [
    { 
      id: 'user-admin', 
      empresa_id: 'emp-001', 
      nombre_completo: 'JEFE SUPREMO', 
      rol: 'SUPER_ADMIN', 
      username: 'admin', 
      password_hash: '123456', 
      estado: true,
      email: 'admin@sistema.local',
      empresas: { id: 'emp-001', nombre_empresa: 'CREDITOS RAPIDOS', estado: true } // Join simulado
    },
    { 
      id: 'user-gerente', 
      empresa_id: 'emp-001', 
      nombre_completo: 'GERENTE SUCURSAL', 
      rol: 'ADMIN', // Rol intermedio
      username: 'gerente', 
      password_hash: '1234', 
      estado: true,
      email: 'gerente@sistema.local',
      empresas: { id: 'emp-001', nombre_empresa: 'CREDITOS RAPIDOS', estado: true }
    },
    { 
      id: 'user-cobrador', 
      empresa_id: 'emp-001', 
      nombre_completo: 'JUAN COBRADOR', 
      rol: 'COBRADOR', 
      username: 'cobrador', 
      password_hash: '1234', 
      estado: true, 
      last_lat: -12.046374, last_lon: -77.042793, last_seen: new Date().toISOString() 
    }
  ],
  rutas: [
    { id: 1, empresa_id: 'emp-001', nombre: 'RUTA CENTRO', usuario_cobrador_id: 'user-cobrador', estado: true },
    { id: 2, empresa_id: 'emp-001', nombre: 'RUTA NORTE', usuario_cobrador_id: null, estado: true }
  ],
  clientes: [
    { id: 'c1', empresa_id: 'emp-001', nombre_completo: 'MARIA TIENDA', dni: '1001', telefono_celular: '3001234567', direccion_texto: 'Calle 10 # 5-20', barrio: 'CENTRO', orden_ruta: 1, ruta_id: 1, gps_latitud: -12.045, gps_longitud: -77.043 },
    { id: 'c2', empresa_id: 'emp-001', nombre_completo: 'PEDRO TALLER', dni: '1002', telefono_celular: '3009998877', direccion_texto: 'Av Principal 404', barrio: 'CENTRO', orden_ruta: 2, ruta_id: 1, gps_latitud: -12.046, gps_longitud: -77.044 },
    { id: 'c3', empresa_id: 'emp-001', nombre_completo: 'ANA PANADERIA', dni: '1003', telefono_celular: '3105556677', direccion_texto: 'Cra 5 # 8-10', barrio: 'NORTE', orden_ruta: 1, ruta_id: 2, gps_latitud: null, gps_longitud: null }
  ],
  creditos: [
    { 
      id: 'cr1', empresa_id: 'emp-001', cliente_id: 'c1', usuario_creador_id: 'user-admin', 
      monto_capital: 1000, monto_interes: 200, total_a_pagar: 1200, saldo_restante: 800, valor_cuota: 60, modalidad_dias: 20, 
      estado: 'ACTIVO', fecha_inicio: '2023-10-01', fecha_fin_estimada: '2023-10-21', fecha_ultimo_pago: new Date().toISOString()
    },
    { 
      id: 'cr2', empresa_id: 'emp-001', cliente_id: 'c2', usuario_creador_id: 'user-admin', 
      monto_capital: 500, monto_interes: 100, total_a_pagar: 600, saldo_restante: 600, valor_cuota: 30, modalidad_dias: 20, 
      estado: 'ACTIVO', fecha_inicio: new Date().toISOString(), fecha_fin_estimada: '2023-11-01', fecha_ultimo_pago: null
    }
  ],
  pagos: [
    { id: 'p1', empresa_id: 'emp-001', credito_id: 'cr1', usuario_cobrador_id: 'user-cobrador', monto: 60, fecha_pago: new Date().toISOString(), metodo_pago: 'EFECTIVO' },
    { id: 'p2', empresa_id: 'emp-001', credito_id: 'cr1', usuario_cobrador_id: 'user-cobrador', monto: 60, fecha_pago: new Date(Date.now() - 86400000).toISOString(), metodo_pago: 'EFECTIVO' }
  ],
  movimientos_capital: [
    { id: 'm1', empresa_id: 'emp-001', usuario_id: 'user-admin', tipo: 'INYECCION', monto: 5000, descripcion: 'Capital Inicial', fecha_movimiento: '2023-01-01' }
  ]
};