// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const SUPABASE_URL = 'https://dweecggxuwbuqzbgqomg.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_KL2YZnb2PKD53Mw9GJ0wcA_IaW8dCy6'; 
const ALLRATES_URL = 'https://allratestoday.com/api/open/central-bank/bcv?source=USD&target=VES';
const ALLRATES_API_KEY = 'art_live_xqWsqDXRYbfw8dUqb4ZOntEE5pXvWXLF';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. ELEMENTOS DEL DOM
// ==========================================
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const bcvRateEl = document.getElementById('bcv-rate');
const productList = document.getElementById('product-list');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-title');
const btnAddProduct = document.getElementById('btn-add-product');

// ==========================================
// 3. AUTENTICACIÓN
// ==========================================
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        showApp();
    } else {
        showLogin();
    }
}

function showApp() {
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    cargarTasaBCV();
    cargarProductos();
}

function showLogin() {
    appScreen.classList.remove('active');
    loginScreen.classList.add('active');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginError.textContent = '';

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        loginError.textContent = 'Error: ' + error.message;
    } else {
        showApp();
    }
});

logoutBtn.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    showLogin();
});

// ==========================================
// 4. TASA BCV
// ==========================================
async function cargarTasaBCV() {
    try {
        const response = await fetch(ALLRATES_URL);
        const data = await response.json();
        if (data && data.rate) {
            bcvRateEl.textContent = `1 USD = ${data.rate.toFixed(2)} VES`;
        }
    } catch (error) {
        console.error('Error tasa:', error);
        bcvRateEl.textContent = 'Tasa no disponible';
    }
}

// ==========================================
// 5. CRUD DE PRODUCTOS
// ==========================================
async function cargarProductos() {
    productList.innerHTML = '<p>Cargando productos...</p>';
    
    const { data, error } = await _supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al cargar:', error);
        productList.innerHTML = '<p>Error al cargar productos.</p>';
        return;
    }

    renderProductos(data);
}

function renderProductos(productos) {
    if (productos.length === 0) {
        productList.innerHTML = '<p>No hay productos registrados.</p>';
        return;
    }

    productList.innerHTML = productos.map(prod => `
        <div class="product-card">
            <div class="product-info">
                <h4>${prod.nombre}</h4>
                <p>Costo: $${prod.costo} | Venta: $${prod.precio_venta}</p>
                <p>Lugar: ${prod.lugar_compra || 'N/A'}</p>
            </div>
            <div class="product-stock">
                <span class="stock-num ${prod.stock_actual <= 2 ? 'low' : ''}">${prod.stock_actual}</span>
                <div class="product-actions">
                    <button class="btn-icon-small" onclick="editarProducto(${prod.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon-small delete" onclick="eliminarProducto(${prod.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// Abrir Modal para Nuevo Producto
btnAddProduct.addEventListener('click', () => {
    productForm.reset();
    document.getElementById('product-id').value = '';
    modalTitle.textContent = 'Nuevo Producto';
    productModal.classList.add('active');
});

// Cerrar Modal
document.querySelector('.close-modal').addEventListener('click', () => {
    productModal.classList.remove('active');
});

// Guardar (Crear o Editar)
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    
    const productoData = {
        nombre: document.getElementById('prod-nombre').value,
        costo: parseFloat(document.getElementById('prod-costo').value),
        lugar_compra: document.getElementById('prod-lugar').value,
        precio_venta: parseFloat(document.getElementById('prod-precio').value),
        porcentaje_ganancia: parseFloat(document.getElementById('prod-ganancia').value),
        stock_actual: parseInt(document.getElementById('prod-stock').value),
        precios_competencia: document.getElementById('prod-competencia').value
    };

    let error;
    if (id) {
        // Actualizar
        const { error: err } = await _supabase.from('productos').update(productoData).eq('id', id);
        error = err;
    } else {
        // Crear
        const { error: err } = await _supabase.from('productos').insert([productoData]);
        error = err;
    }

    if (error) {
        alert('Error al guardar: ' + error.message);
    } else {
        productModal.classList.remove('active');
        cargarProductos();
    }
});

// Función global para Editar
window.editarProducto = async (id) => {
    const { data, error } = await _supabase.from('productos').select('*').eq('id', id).single();
    if (error) return alert('Error al obtener producto');

    document.getElementById('product-id').value = data.id;
    document.getElementById('prod-nombre').value = data.nombre;
    document.getElementById('prod-costo').value = data.costo;
    document.getElementById('prod-lugar').value = data.lugar_compra;
    document.getElementById('prod-precio').value = data.precio_venta;
    document.getElementById('prod-ganancia').value = data.porcentaje_ganancia;
    document.getElementById('prod-stock').value = data.stock_actual;
    document.getElementById('prod-competencia').value = data.precios_competencia;

    modalTitle.textContent = 'Editar Producto';
    productModal.classList.add('active');
};

// Función global para Eliminar
window.eliminarProducto = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    const { error } = await _supabase.from('productos').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        cargarProductos();
    }
};

// ==========================================
// 6. NAVEGACIÓN POR PESTAÑAS
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Quitar active de todos
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activar el seleccionado
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ==========================================
// 8. MÓDULO DE VENTAS
// ==========================================

// Variables globales del carrito
let carrito = [];
let tasaActual = 0;
let productosCache = []; // Para búsquedas rápidas

// --- Cargar productos en caché al iniciar ---
async function cargarProductosCache() {
    const { data } = await _supabase.from('productos').select('*').order('nombre');
    productosCache = data || [];
}

// --- Buscador de Productos ---
const searchInput = document.getElementById('search-product');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (term.length < 2) {
        searchResults.classList.remove('active');
        return;
    }

    const filtrados = productosCache.filter(p => 
        p.nombre.toLowerCase().includes(term) && p.stock_actual > 0
    );

    if (filtrados.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No se encontraron productos con stock</div>';
    } else {
        searchResults.innerHTML = filtrados.map(p => `
            <div class="search-result-item" onclick="agregarAlCarrito(${p.id})">
                <span>${p.nombre}</span>
                <span>$${p.precio_venta} | Stock: ${p.stock_actual}</span>
            </div>
        `).join('');
    }
    searchResults.classList.add('active');
});

// Ocultar resultados al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

// --- Lógica del Carrito ---
window.agregarAlCarrito = (productoId) => {
    const producto = productosCache.find(p => p.id === productoId);
    if (!producto) return;

    const itemExistente = carrito.find(item => item.id === productoId);
    
    if (itemExistente) {
        if (itemExistente.cantidad < producto.stock_actual) {
            itemExistente.cantidad++;
        } else {
            alert('No hay suficiente stock disponible');
        }
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio_venta: parseFloat(producto.precio_venta),
            costo: parseFloat(producto.costo),
            cantidad: 1,
            stock_max: producto.stock_actual
        });
    }

    searchInput.value = '';
    searchResults.classList.remove('active');
    renderCarrito();
};

window.cambiarCantidad = (productoId, delta) => {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad <= 0) {
        carrito = carrito.filter(i => i.id !== productoId);
    } else if (nuevaCantidad <= item.stock_max) {
        item.cantidad = nuevaCantidad;
    } else {
        alert('No hay suficiente stock');
    }
    renderCarrito();
};

window.eliminarDelCarrito = (productoId) => {
    carrito = carrito.filter(i => i.id !== productoId);
    renderCarrito();
};

function renderCarrito() {
    const cartContainer = document.getElementById('cart-items');
    
    if (carrito.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">El carrito está vacío</p>';
        document.getElementById('btn-checkout').disabled = true;
    } else {
        cartContainer.innerHTML = carrito.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h5>${item.nombre}</h5>
                    <span>$${item.precio_venta.toFixed(2)} c/u</span>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                    <span class="cart-item-subtotal">$${(item.precio_venta * item.cantidad).toFixed(2)}</span>
                    <button class="btn-icon-small delete" onclick="eliminarDelCarrito(${item.id})"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `).join('');
        document.getElementById('btn-checkout').disabled = false;
    }

    actualizarTotales();
}

function actualizarTotales() {
    const totalUSD = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const totalBs = totalUSD * tasaActual;

    document.getElementById('total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('rate-used').textContent = `${tasaActual.toFixed(2)})`;
    document.getElementById('total-bs').textContent = `Bs. ${totalBs.toFixed(2)}`;
}

// --- Modificar la función cargarTasaBCV para guardar la tasa ---
// Busca la función cargarTasaBCV y modifícala para que guarde la tasa en la variable global
// (Reemplaza la función existente con esta)
async function cargarTasaBCV() {
    try {
        const response = await fetch(ALLRATES_URL);
        const data = await response.json();
        if (data && data.rate) {
            tasaActual = parseFloat(data.rate);
            bcvRateEl.textContent = `1 USD = ${tasaActual.toFixed(2)} VES`;
            // Si hay items en el carrito, actualizar totales
            if (carrito.length > 0) actualizarTotales();
        }
    } catch (error) {
        console.error('Error tasa:', error);
        bcvRateEl.textContent = 'Tasa no disponible';
    }
}

// --- Checkout ---
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');

document.getElementById('btn-checkout').addEventListener('click', () => {
    const totalUSD = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const totalBs = totalUSD * tasaActual;
    
    document.getElementById('checkout-total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('checkout-total-bs').textContent = `Bs. ${totalBs.toFixed(2)}`;
    
    checkoutModal.classList.add('active');
});

document.querySelector('.close-checkout-modal').addEventListener('click', () => {
    checkoutModal.classList.remove('active');
});

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apto = document.getElementById('checkout-apto').value.trim();
    const totalUSD = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const totalBs = totalUSD * tasaActual;

    // 1. Insertar la venta principal
    const { data: ventaData, error: ventaError } = await _supabase
        .from('ventas')
        .insert([{
            total_usd: totalUSD,
            total_bs: totalBs,
            tasa_bcv: tasaActual,
            apartamento_vecino: apto || null
        }])
        .select()
        .single();

    if (ventaError) {
        alert('Error al guardar la venta: ' + ventaError.message);
        return;
    }

    const ventaId = ventaData.id;

    // 2. Insertar los detalles de la venta
    const detalles = carrito.map(item => ({
        venta_id: ventaId,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        subtotal: item.precio_venta * item.cantidad
    }));

    const { error: detallesError } = await _supabase.from('detalles_ventas').insert(detalles);

    if (detallesError) {
        alert('Error al guardar detalles: ' + detallesError.message);
        return;
    }

    // 3. Descontar stock de cada producto
    for (const item of carrito) {
        const producto = productosCache.find(p => p.id === item.id);
        const nuevoStock = producto.stock_actual - item.cantidad;
        
        await _supabase
            .from('productos')
            .update({ stock_actual: nuevoStock })
            .eq('id', item.id);
    }

    // 4. Limpiar y actualizar
    alert('¡Venta registrada con éxito!');
    carrito = [];
    renderCarrito();
    checkoutModal.classList.remove('active');
    checkoutForm.reset();
    
    // Recargar datos
    await cargarProductos();
    await cargarProductosCache();
    await cargarHistorialVentas();
});

// --- Historial de Ventas ---
async function cargarHistorialVentas(desde = null, hasta = null) {
    let query = _supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59');

    const { data, error } = await query;

    if (error) {
        console.error('Error historial:', error);
        return;
    }

    renderHistorial(data);
    calcularTotalesPeriodo(data);
}

function renderHistorial(ventas) {
    const container = document.getElementById('sales-history');
    if (ventas.length === 0) {
        container.innerHTML = '<p>No hay ventas en este período.</p>';
        return;
    }

    container.innerHTML = ventas.map(v => `
        <div class="sale-record">
            <div><strong>${new Date(v.fecha).toLocaleString()}</strong></div>
            <div>Total: $${parseFloat(v.total_usd).toFixed(2)} | Bs. ${parseFloat(v.total_bs).toFixed(2)}</div>
            <div>Tasa: ${parseFloat(v.tasa_bcv).toFixed(2)}</div>
            ${v.apartamento_vecino ? `<div><i class="fas fa-door-open"></i> Apto: ${v.apartamento_vecino}</div>` : ''}
        </div>
    `).join('');
}

function calcularTotalesPeriodo(ventas) {
    // Para calcular la ganancia, necesitamos los detalles de cada venta
    // Por simplicidad, haremos una consulta agregada
    // NOTA: Esto es una aproximación. Lo ideal sería traer los detalles.
    
    const totalUSD = ventas.reduce((sum, v) => sum + parseFloat(v.total_usd), 0);
    
    // Para ganancia, necesitamos consultar detalles_ventas
    // Haremos una consulta aparte
    calcularGananciaPeriodo(ventas.map(v => v.id), totalUSD);
}

async function calcularGananciaPeriodo(ventaIds, totalUSD) {
    if (ventaIds.length === 0) {
        document.getElementById('sum-total-usd').textContent = '$0.00';
        document.getElementById('sum-profit').textContent = '$0.00';
        document.getElementById('sum-cost').textContent = '$0.00';
        return;
    }

    // Obtener detalles de las ventas
    const { data: detalles } = await _supabase
        .from('detalles_ventas')
        .select('subtotal, cantidad, producto_id')
        .in('venta_id', ventaIds);

    if (!detalles) return;

    // Obtener costos de los productos
    const productoIds = [...new Set(detalles.map(d => d.producto_id))];
    const { data: productos } = await _supabase
        .from('productos')
        .select('id, costo')
        .in('id', productoIds);

    const costosMap = {};
    productos.forEach(p => costosMap[p.id] = parseFloat(p.costo));

    // Calcular
    const costoTotal = detalles.reduce((sum, d) => {
        const costoUnit = costosMap[d.producto_id] || 0;
        return sum + (costoUnit * d.cantidad);
    }, 0);

    const gananciaNeta = totalUSD - costoTotal;

    document.getElementById('sum-total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('sum-profit').textContent = `$${gananciaNeta.toFixed(2)}`;
    document.getElementById('sum-cost').textContent = `$${costoTotal.toFixed(2)}`;
}

// Filtros de fecha
document.getElementById('btn-filter').addEventListener('click', () => {
    const desde = document.getElementById('filter-from').value;
    const hasta = document.getElementById('filter-to').value;
    cargarHistorialVentas(desde || null, hasta || null);
});

// Modificar la función showApp para cargar los datos de ventas también
const originalShowApp = showApp;
showApp = function() {
    originalShowApp();
    cargarProductosCache();
    cargarHistorialVentas();
};

// ==========================================
// 7. INICIALIZACIÓN
// ==========================================
checkSession();