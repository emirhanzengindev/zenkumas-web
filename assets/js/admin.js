// Admin panel JavaScript for Zentekstil

// API Base URL
const apiBase = 'https://api.zentekstil.com.tr';

// Check if user is authenticated
function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        window.location.href = '../giris.html';
        return false;
    }
    return true;
}

// Logout function
function adminLogout() {
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
}

// Show notification
function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${apiBase}/kumaslar`);
        const fabrics = await response.json();
        
        // Update statistics
        document.getElementById('total-fabrics').textContent = fabrics.length;
        
        const inStock = fabrics.filter(f => f.stok_durumu === 'evet').length;
        const outOfStock = fabrics.length - inStock;
        
        document.getElementById('in-stock').textContent = inStock;
        document.getElementById('out-of-stock').textContent = outOfStock;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load fabrics for admin table
async function loadAdminFabrics() {
    try {
        const response = await fetch(`${apiBase}/kumaslar`);
        const fabrics = await response.json();
        
        const tableBody = document.getElementById('fabrics-table-body');
        tableBody.innerHTML = '';
        
        fabrics.forEach(fabric => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <img class="h-10 w-10 rounded-full" src="${apiBase}/uploads/${fabric.kartela_resmi}" alt="${fabric.isim}">
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${fabric.isim}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${fabric.tur || 'Belirtilmemiş'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${fabric.stok_durumu === 'evet' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${fabric.stok_durumu === 'evet' ? 'Stokta' : 'Tükendi'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="duzenle.html?id=${fabric.id}" class="text-blue-600 hover:text-blue-900 mr-3">Düzenle</a>
                    <button onclick="deleteFabric(${fabric.id})" class="text-red-600 hover:text-red-900">Sil</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading fabrics:', error);
        showNotification('Kumaşlar yüklenirken bir hata oluştu.', 'error');
    }
}

// Delete fabric
async function deleteFabric(id) {
    if (!confirm('Bu kumaşı silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`${apiBase}/kumaslar/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Kumaş başarıyla silindi.');
            loadAdminFabrics(); // Refresh the list
            loadDashboardStats(); // Refresh stats
        } else {
            showNotification('Kumaş silinirken bir hata oluştu.', 'error');
        }
    } catch (error) {
        console.error('Error deleting fabric:', error);
        showNotification('Kumaş silinirken bir hata oluştu.', 'error');
    }
}

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(window.location.href);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Load fabric data for editing
async function loadFabricForEdit(id) {
    try {
        const response = await fetch(`${apiBase}/kumaslar/${id}`);
        const fabric = await response.json();
        
        if (fabric) {
            document.getElementById('form-title').textContent = 'Kumaş Düzenle';
            document.getElementById('fabric-id').value = fabric.id;
            document.getElementById('isim').value = fabric.isim;
            document.getElementById('tur').value = fabric.tur || 'soho';
            document.getElementById('aciklama').value = fabric.aciklama || '';
            
            // Set stock status
            if (fabric.stok_durumu === 'evet') {
                document.getElementById('stok-evet').checked = true;
            } else {
                document.getElementById('stok-hayir').checked = true;
            }
            
            // Show image preview if exists
            if (fabric.kartela_resmi) {
                document.getElementById('image-preview').src = `${apiBase}/uploads/${fabric.kartela_resmi}`;
                document.getElementById('image-preview').classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading fabric:', error);
        showNotification('Kumaş bilgileri yüklenirken bir hata oluştu.', 'error');
    }
}

// Handle fabric form submission
async function handleFabricFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('isim', document.getElementById('isim').value);
    formData.append('tur', document.getElementById('tur').value);
    formData.append('aciklama', document.getElementById('aciklama').value);
    formData.append('stok_durumu', document.querySelector('input[name="stok_durumu"]:checked').value);
    
    const imageFile = document.getElementById('kartela_resmi').files[0];
    if (imageFile) {
        formData.append('kartela_resmi', imageFile);
    }
    
    try {
        let response;
        const fabricId = document.getElementById('fabric-id').value;
        
        if (fabricId) {
            // Update existing fabric
            response = await fetch(`${apiBase}/kumaslar/${fabricId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Create new fabric
            response = await fetch(`${apiBase}/kumaslar`, {
                method: 'POST',
                body: formData
            });
        }
        
        if (response.ok) {
            showNotification(fabricId ? 'Kumaş başarıyla güncellendi.' : 'Kumaş başarıyla eklendi.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            const error = await response.json();
            showNotification(`Hata: ${error.message || 'Bir hata oluştu.'}`, 'error');
        }
    } catch (error) {
        console.error('Error saving fabric:', error);
        showNotification('Kumaş kaydedilirken bir hata oluştu.', 'error');
    }
}

// Image preview
function setupImagePreview() {
    const imageInput = document.getElementById('kartela_resmi');
    const imagePreview = document.getElementById('image-preview');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication for admin pages
    if (window.location.pathname.includes('/admin/')) {
        if (!checkAdminAuth()) {
            return;
        }
    }
    
    // Dashboard page
    if (document.getElementById('total-fabrics')) {
        loadDashboardStats();
        loadAdminFabrics();
    }
    
    // Edit fabric page
    if (document.getElementById('fabric-form')) {
        setupImagePreview();
        document.getElementById('fabric-form').addEventListener('submit', handleFabricFormSubmit);
        
        // Check if we're editing an existing fabric
        const fabricId = getUrlParameter('id');
        if (fabricId) {
            loadFabricForEdit(fabricId);
        }
    }
});