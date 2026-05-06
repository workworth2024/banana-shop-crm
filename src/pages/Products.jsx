import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Youtube, Globe, Filter as FilterIcon, 
  ChevronLeft, ChevronRight, Package, Image as ImageIcon, X, Check,
  Settings2, Calendar, MapPin
} from 'lucide-react';
import { getFilters, createFilter, updateFilter, deleteFilter, getYoutubeProducts, getGoogleAdsProducts, saveProduct, deleteProduct } from '../api/products';
import { useAuthStore } from '../stores/authStore';
import countries from '../utils/countries.json';
import ACCOUNT_TYPES from '../constants/accountTypes';
import { useConfirm } from '../components/ConfirmDialog';
import { ImageUploadInput } from '../components/FileUploadInput';
import DigitalInventoryModal from '../components/DigitalInventoryModal';
import toast from 'react-hot-toast';

const Products = () => {
  const [activeTab, setActiveTab] = useState('youtube');
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedGeo, setSelectedGeo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingFilter, setEditingFilter] = useState(null);
  const [inventoryProduct, setInventoryProduct] = useState(null);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Form states
  const [productForm, setProductForm] = useState({});
  const [filterForm, setFilterForm] = useState({ 'name.ru': '', 'name.en': '', color: '#008b8b' });
  const [imageFile, setImageFile] = useState(null);
  const [geoSearch, setGeoSearch] = useState('');
  const { confirm, ConfirmNode } = useConfirm();
  const [columnWidths, setColumnWidths] = useState({
    id: 80,
    type: 100,
    geo: 100,
    image: 80,
    title: 200,
    subTitle: 150,
    desc: 250,
    inclusive: 200,
    get: 200,
    counts: 100,
    price: 100,
    filter: 150,
    link: 180,
    wholesale: 120,
    countWholesale: 120
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Simple notification could be added here, but user just asked for the feature
  };

  const handleResize = (column, newWidth) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(newWidth, 50)
    }));
  };

  const Resizer = ({ onResize }) => {
    const onMouseDown = (e) => {
      const startX = e.pageX;
      const startWidth = e.target.parentElement.offsetWidth;

      const onMouseMove = (moveEvent) => {
        const newWidth = startWidth + (moveEvent.pageX - startX);
        onResize(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    return (
      <div 
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '5px',
          cursor: 'col-resize',
          zIndex: 1,
          backgroundColor: 'transparent'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      />
    );
  };

  const ClickableCell = ({ children, text, style = {} }) => (
    <td 
      onClick={() => copyToClipboard(text || children?.toString() || '')}
      style={{ 
        padding: '1rem 1.5rem', 
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s',
        ...style
      }}
      title="Нажмите, чтобы скопировать"
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {children}
    </td>
  );

  const fetchFilters = useCallback(async () => {
    try {
      const data = await getFilters();
      setFilters(data);
    } catch (err) {
      console.error('Fetch filters error:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        search,
        filter: selectedFilter,
        type: selectedType,
        geo: selectedGeo,
        startDate,
        endDate
      });
      
      const data = await (activeTab === 'youtube' ? getYoutubeProducts(queryParams) : getGoogleAdsProducts(queryParams));
      setProducts(data.products);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, search, selectedFilter, selectedType, selectedGeo, startDate, endDate]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearch('');
    setSelectedFilter('');
    setSelectedType('');
    setSelectedGeo('');
    setStartDate('');
    setEndDate('');
  };

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        type: product.type,
        'title.ru': product.title?.ru || '',
        'title.en': product.title?.en || '',
        'sub_title.ru': product.sub_title?.ru || '',
        'sub_title.en': product.sub_title?.en || '',
        'desc.ru': product.desc?.ru || '',
        'desc.en': product.desc?.en || '',
        'inclusive.ru': product.inclusive?.ru || '',
        'inclusive.en': product.inclusive?.en || '',
        'receive.ru': product.receive?.ru || '',
        'receive.en': product.receive?.en || '',
        price: product.price,
        counts: product.counts,
        filter_id: product.filter_id,
        geo: product.geo,
        path_image: product.path_image,
        link: product.link || '',
        wholesale_price: product.wholesale_price ?? '',
        count_for_wholesale: product.count_for_wholesale ?? ''
      });
      setGeoSearch('');
    } else {
      setEditingProduct(null);
      setProductForm(activeTab === 'youtube' 
        ? { type: 'item', 'title.ru': '', 'title.en': '', 'desc.ru': '', 'desc.en': '', price: 0, counts: 0, filter_id: '', geo: 'US', link: '', wholesale_price: '', count_for_wholesale: '' }
        : { type: '', 'title.ru': '', 'title.en': '', 'sub_title.ru': '', 'sub_title.en': '', 'desc.ru': '', 'desc.en': '', 'inclusive.ru': '', 'inclusive.en': '', 'receive.ru': '', 'receive.en': '', price: 0, counts: 0, filter_id: '', geo: 'US', link: '', wholesale_price: '', count_for_wholesale: '' }
      );
      setGeoSearch('');
    }
    setImageFile(null);
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm['title.ru'] && !productForm['title.en']) {
      toast.error('Название должно быть заполнено на русском или английском языке');
      return;
    }
    if (!productForm['desc.ru'] && !productForm['desc.en']) {
      toast.error('Описание должно быть заполнено на русском или английском языке');
      return;
    }
    
    const formData = new FormData();
    formData.append('type', productForm.type);
    formData.append('title.ru', productForm['title.ru'] || '');
    formData.append('title.en', productForm['title.en'] || '');
    formData.append('desc.ru', productForm['desc.ru'] || '');
    formData.append('desc.en', productForm['desc.en'] || '');
    
    if (activeTab === 'google-ads') {
      formData.append('sub_title.ru', productForm['sub_title.ru'] || '');
      formData.append('sub_title.en', productForm['sub_title.en'] || '');
      formData.append('inclusive.ru', productForm['inclusive.ru'] || '');
      formData.append('inclusive.en', productForm['inclusive.en'] || '');
      formData.append('receive.ru', productForm['receive.ru'] || '');
      formData.append('receive.en', productForm['receive.en'] || '');
    }
    
    formData.append('price', productForm.price);
    formData.append('counts', productForm.counts);
    formData.append('geo', productForm.geo);
    formData.append('link', productForm.link || '');
    if (productForm.wholesale_price !== '' && productForm.wholesale_price !== null) {
      formData.append('wholesale_price', productForm.wholesale_price);
    }
    if (productForm.count_for_wholesale !== '' && productForm.count_for_wholesale !== null) {
      formData.append('count_for_wholesale', productForm.count_for_wholesale);
    }
    
    const filterId = productForm.filter_id?._id || productForm.filter_id || '';
    formData.append('filter_id', filterId);

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      await saveProduct(formData, activeTab, editingProduct?._id || null);
      toast.success(editingProduct ? 'Товар успешно изменён' : 'Товар успешно добавлен');
      setShowProductModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Ошибка сохранения');
    }
  };

  const handleDeleteProduct = async (id) => {
    const ok = await confirm('Вы уверены, что хотите удалить этот товар?');
    if (!ok) return;
    try {
      await deleteProduct(activeTab, id);
      fetchProducts();
      toast.success('Товар удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const handleFilterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFilter) {
        await updateFilter(editingFilter._id, filterForm);
        toast.success('Фильтр изменён');
      } else {
        await createFilter(filterForm);
        toast.success('Фильтр добавлен');
      }
      setShowFilterModal(false);
      fetchFilters();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Товары</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Управление ассортиментом магазина</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => { setEditingFilter(null); setFilterForm({ 'name.ru': '', 'name.en': '', color: '#008b8b' }); setShowFilterModal(true); }}
              style={{ backgroundColor: '#f3f4f6', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Settings2 size={18} />
              Фильтры
            </button>
            <button 
              onClick={() => openProductModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} />
              Добавить товар
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <button 
          onClick={() => handleTabChange('youtube')}
          style={{ 
            backgroundColor: 'transparent', 
            color: activeTab === 'youtube' ? 'var(--primary)' : '#6b7280',
            borderBottom: activeTab === 'youtube' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: 0,
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: activeTab === 'youtube' ? '700' : '500'
          }}
        >
          <Youtube size={20} />
          YouTube
        </button>
        <button 
          onClick={() => handleTabChange('google-ads')}
          style={{ 
            backgroundColor: 'transparent', 
            color: activeTab === 'google-ads' ? 'var(--primary)' : '#6b7280',
            borderBottom: activeTab === 'google-ads' ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: 0,
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: activeTab === 'google-ads' ? '700' : '500'
          }}
        >
          <Globe size={20} />
          Google Ads
        </button>
      </div>

      {/* Filters & Search & Date */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '16px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Поиск товара..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Тип товара</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setSelectedType('')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.8125rem',
                  backgroundColor: selectedType === '' ? 'var(--primary)' : '#f3f4f6',
                  color: selectedType === '' ? 'white' : '#4b5563',
                  border: 'none'
                }}
              >
                Все
              </button>
              {activeTab === 'youtube' ? (
                <>
                  <button 
                    onClick={() => setSelectedType('item')}
                    style={{ 
                      padding: '0.5rem 1rem', fontSize: '0.8125rem',
                      backgroundColor: selectedType === 'item' ? 'var(--primary)' : '#f3f4f6',
                      color: selectedType === 'item' ? 'white' : '#4b5563',
                      border: 'none'
                    }}
                  >
                    Аккаунты
                  </button>
                  <button 
                    onClick={() => setSelectedType('service')}
                    style={{ 
                      padding: '0.5rem 1rem', fontSize: '0.8125rem',
                      backgroundColor: selectedType === 'service' ? 'var(--primary)' : '#f3f4f6',
                      color: selectedType === 'service' ? 'white' : '#4b5563',
                      border: 'none'
                    }}
                  >
                    Услуги
                  </button>
                </>
              ) : (
                <>
                  {Object.entries(ACCOUNT_TYPES).map(([key, labels]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedType(key)}
                      style={{
                        padding: '0.5rem 1rem', fontSize: '0.8125rem',
                        backgroundColor: selectedType === key ? 'var(--primary)' : '#f3f4f6',
                        color: selectedType === key ? 'white' : '#4b5563',
                        border: 'none'
                      }}
                    >
                      {labels.ru}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 2 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Гео (Страна)</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setSelectedGeo('')}
                style={{ 
                  padding: '0.5rem 1rem', fontSize: '0.8125rem',
                  backgroundColor: selectedGeo === '' ? '#374151' : '#f3f4f6',
                  color: selectedGeo === '' ? 'white' : '#4b5563',
                  border: 'none'
                }}
              >
                Все ГЕО
              </button>
              {['US', 'UA', 'RU', 'DE', 'FR', 'GB', 'KZ'].map(code => {
                const country = countries.find(c => c.code === code);
                return (
                  <button 
                    key={code}
                    onClick={() => setSelectedGeo(code)}
                    style={{ 
                      padding: '0.5rem 1rem', fontSize: '0.8125rem',
                      backgroundColor: selectedGeo === code ? 'var(--primary)' : '#f3f4f6',
                      color: selectedGeo === code ? 'white' : '#4b5563',
                      border: 'none'
                    }}
                  >
                    {country?.ruName || code}
                  </button>
                );
              })}
              <select 
                value={['US', 'UA', 'RU', 'DE', 'FR', 'GB', 'KZ'].includes(selectedGeo) || selectedGeo === '' ? '' : selectedGeo}
                onChange={(e) => setSelectedGeo(e.target.value)}
                style={{ width: 'auto', padding: '0.5rem', fontSize: '0.8125rem' }}
              >
                <option value="">Другие...</option>
                {countries.filter(c => !['US', 'UA', 'RU', 'DE', 'FR', 'GB', 'KZ'].includes(c.code)).map(c => (
                  <option key={c.code} value={c.code}>{c.ruName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 2 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Фильтры (теги)</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setSelectedFilter('')}
                style={{ 
                  padding: '0.5rem 1rem', fontSize: '0.8125rem',
                  backgroundColor: selectedFilter === '' ? '#374151' : '#f3f4f6',
                  color: selectedFilter === '' ? 'white' : '#4b5563',
                  border: 'none'
                }}
              >
                Все фильтры
              </button>
              {filters.map(f => (
                <button 
                  key={f._id}
                  onClick={() => setSelectedFilter(f._id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', fontSize: '0.8125rem',
                    backgroundColor: selectedFilter === f._id ? `${f.color}20` : '#f3f4f6',
                    color: selectedFilter === f._id ? f.color : '#4b5563',
                    border: selectedFilter === f._id ? `1px solid ${f.color}` : '1px solid transparent',
                    fontWeight: selectedFilter === f._id ? '700' : '400'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: f.color }} />
                  {f.name.ru || f.name.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            <Calendar size={16} />
            <span>Период:</span>
          </div>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            style={{ width: 'auto', padding: '0.5rem' }} 
          />
          <span style={{ color: '#9ca3af' }}>—</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            style={{ width: 'auto', padding: '0.5rem' }} 
          />
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ backgroundColor: '#f3f4f6', color: '#6b7280', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
            >
              Сбросить даты
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ width: `${columnWidths.id}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                ID <Resizer onResize={(w) => handleResize('id', w)} />
              </th>
              <th style={{ width: `${columnWidths.type}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Тип <Resizer onResize={(w) => handleResize('type', w)} />
              </th>
              <th style={{ width: `${columnWidths.geo}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                ГЕО <Resizer onResize={(w) => handleResize('geo', w)} />
              </th>
              <th style={{ width: `${columnWidths.image}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Фотка <Resizer onResize={(w) => handleResize('image', w)} />
              </th>
              <th style={{ width: `${columnWidths.title}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Название <Resizer onResize={(w) => handleResize('title', w)} />
              </th>
              {activeTab === 'google-ads' && (
                <th style={{ width: `${columnWidths.subTitle}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                  Под-название <Resizer onResize={(w) => handleResize('subTitle', w)} />
                </th>
              )}
              <th style={{ width: `${columnWidths.desc}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Описание <Resizer onResize={(w) => handleResize('desc', w)} />
              </th>
              {activeTab === 'google-ads' && (
                <>
                  <th style={{ width: `${columnWidths.inclusive}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                    Включено <Resizer onResize={(w) => handleResize('inclusive', w)} />
                  </th>
                  <th style={{ width: `${columnWidths.get}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                    Получаете <Resizer onResize={(w) => handleResize('get', w)} />
                  </th>
                </>
              )}
              <th style={{ width: `${columnWidths.counts}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Кол-во <Resizer onResize={(w) => handleResize('counts', w)} />
              </th>
              <th style={{ width: `${columnWidths.price}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Цена <Resizer onResize={(w) => handleResize('price', w)} />
              </th>
              <th style={{ width: `${columnWidths.filter}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Фильтр <Resizer onResize={(w) => handleResize('filter', w)} />
              </th>
              <th style={{ width: `${columnWidths.link}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Ссылка <Resizer onResize={(w) => handleResize('link', w)} />
              </th>
              <th style={{ width: `${columnWidths.wholesale}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Опт.цена <Resizer onResize={(w) => handleResize('wholesale', w)} />
              </th>
              <th style={{ width: `${columnWidths.countWholesale}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Кол-во опт <Resizer onResize={(w) => handleResize('countWholesale', w)} />
              </th>
              <th style={{ width: '120px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="20" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="20" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Товары не найдены</td></tr>
            ) : products.map(p => {
              const country = countries.find(c => c.code === p.geo);
              return (
              <tr key={p._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <ClickableCell text={p._id} style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{p._id.slice(-6)}</ClickableCell>
                <ClickableCell text={p.type}>
                  <span style={{ 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '6px', 
                    backgroundColor: '#f3f4f6', 
                    color: '#4b5563',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {p.type?.replace('-', ' ')}
                  </span>
                </ClickableCell>
                <ClickableCell text={p.geo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: '600' }} title={country?.ruName}>{p.geo || 'US'}</span>
                  </div>
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                    {p.path_image ? <img src={`${import.meta.env.VITE_API_URL}${p.path_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color="#9ca3af" />}
                  </div>
                </td>
                <ClickableCell text={p.title?.ru || p.title?.en || ''} style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{p.title?.ru || p.title?.en || ''}</ClickableCell>
                {activeTab === 'google-ads' && <ClickableCell text={p.sub_title?.ru || p.sub_title?.en || ''} style={{ fontSize: '0.875rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sub_title?.ru || p.sub_title?.en || '—'}</ClickableCell>}
                <ClickableCell text={p.desc?.ru || p.desc?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc?.ru || p.desc?.en || ''}</ClickableCell>
                {activeTab === 'google-ads' && (
                  <>
                    <ClickableCell text={p.inclusive?.ru || p.inclusive?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.inclusive?.ru || p.inclusive?.en || '—'}</ClickableCell>
                    <ClickableCell text={p.receive?.ru || p.receive?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.receive?.ru || p.receive?.en || '—'}</ClickableCell>
                  </>
                )}
                <ClickableCell text={p.counts.toString()}>
                   <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', backgroundColor: p.counts > 0 ? '#ecfdf5' : '#fef2f2', color: p.counts > 0 ? '#059669' : '#dc2626', fontSize: '0.75rem', fontWeight: '700' }}>
                     {p.counts} шт.
                   </span>
                </ClickableCell>
                <ClickableCell text={p.price.toString()} style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1rem' }}>${p.price}</ClickableCell>
                <ClickableCell text={p.filter_id ? (p.filter_id.name.ru || p.filter_id.name.en) : ''}>
                  {p.filter_id ? (
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '8px', 
                      backgroundColor: `${p.filter_id.color}10`, 
                      color: p.filter_id.color, 
                      border: `1px solid ${p.filter_id.color}30`,
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.filter_id.color }} />
                      {p.filter_id.name.ru || p.filter_id.name.en}
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                  )}
                </ClickableCell>
                <ClickableCell text={p.link || ''} style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }} onClick={e => e.stopPropagation()}>{p.link}</a> : '—'}
                </ClickableCell>
                <ClickableCell text={p.wholesale_price != null ? p.wholesale_price.toString() : ''} style={{ fontWeight: '600', color: '#7c3aed' }}>
                  {p.wholesale_price != null ? `$${p.wholesale_price}` : '—'}
                </ClickableCell>
                <ClickableCell text={p.count_for_wholesale != null ? p.count_for_wholesale.toString() : ''}>
                  {p.count_for_wholesale != null ? `${p.count_for_wholesale} шт.` : '—'}
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setInventoryProduct({ product: p, productType: activeTab === 'youtube' ? 'YoutubeProduct' : 'GoogleAdsProduct' })} style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '8px' }} title="Файлы / Инвентарь">
                        <Package size={16} />
                      </button>
                      <button onClick={() => openProductModal(p)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteProduct(p._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Всего: <b>{total}</b> товаров</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600' }}>{currentPage} / {pages}</div>
            <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)} style={{ opacity: currentPage === pages ? 0.5 : 1 }}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700' }}>{editingProduct ? 'Редактировать' : 'Добавить'} товар ({activeTab.toUpperCase()})</h2>
              <button type="button" onClick={() => setShowProductModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Название *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="text" placeholder="Русский" value={productForm['title.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'title.ru': e.target.value})} style={{ flex: 1 }} />
                  <input type="text" placeholder="English" value={productForm['title.en'] || ''} onChange={(e) => setProductForm({...productForm, 'title.en': e.target.value})} style={{ flex: 1 }} />
                </div>
              </div>
              <div style={{ width: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Тип</label>
                <select value={productForm.type || ''} onChange={(e) => setProductForm({...productForm, type: e.target.value})} required>
                  <option value="" disabled>— выберите тип —</option>
                  {activeTab === 'youtube' ? (
                    <>
                      <option value="item">Аккаунты</option>
                      <option value="service">Услуги</option>
                    </>
                  ) : (
                    Object.entries(ACCOUNT_TYPES).map(([key, labels]) => (
                      <option key={key} value={key}>{labels.ru}</option>
                    ))
                  )}
                </select>
              </div>
              {activeTab === 'google-ads' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Подзаголовок</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input type="text" placeholder="Русский" value={productForm['sub_title.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'sub_title.ru': e.target.value})} style={{ flex: 1 }} />
                    <input type="text" placeholder="English" value={productForm['sub_title.en'] || ''} onChange={(e) => setProductForm({...productForm, 'sub_title.en': e.target.value})} style={{ flex: 1 }} />
                  </div>
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Описание *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea placeholder="Русский" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={productForm['desc.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'desc.ru': e.target.value})} />
                  <textarea placeholder="English" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={productForm['desc.en'] || ''} onChange={(e) => setProductForm({...productForm, 'desc.en': e.target.value})} />
                </div>
              </div>
              {activeTab === 'google-ads' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Включено</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <textarea 
                        placeholder="Русский"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }}
                        value={productForm['inclusive.ru'] || ''} 
                        onChange={(e) => setProductForm({...productForm, 'inclusive.ru': e.target.value})} 
                      />
                      <textarea 
                        placeholder="English"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }}
                        value={productForm['inclusive.en'] || ''} 
                        onChange={(e) => setProductForm({...productForm, 'inclusive.en': e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Получаете</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <textarea 
                        placeholder="Русский"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }}
                        value={productForm['receive.ru'] || ''} 
                        onChange={(e) => setProductForm({...productForm, 'receive.ru': e.target.value})} 
                      />
                      <textarea 
                        placeholder="English"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }}
                        value={productForm['receive.en'] || ''} 
                        onChange={(e) => setProductForm({...productForm, 'receive.en': e.target.value})} 
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)' }}>ГЕО (Страна товара)</label>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input 
                    type="text" 
                    placeholder="Поиск страны..." 
                    value={geoSearch}
                    onChange={(e) => setGeoSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                  />
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                  gap: '0.5rem', 
                  maxHeight: '150px', 
                  overflowY: 'auto',
                  padding: '0.5rem',
                  border: '1px solid #f3f4f6',
                  borderRadius: '10px'
                }}>
                  {countries.filter(c => 
                    c.name.toLowerCase().includes(geoSearch.toLowerCase()) || 
                    c.ruName.toLowerCase().includes(geoSearch.toLowerCase()) ||
                    c.code.toLowerCase().includes(geoSearch.toLowerCase())
                  ).map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setProductForm({...productForm, geo: c.code})}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: productForm.geo === c.code ? 'var(--primary)' : '#f9fafb',
                        color: productForm.geo === c.code ? 'white' : 'var(--text-main)',
                        border: productForm.geo === c.code ? 'none' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '700' }}>{c.code}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{c.ruName}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Цена ($)</label><input type="number" step="0.01" value={productForm.price || 0} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Кол-во</label><input type="number" value={productForm.counts || 0} onChange={(e) => setProductForm({...productForm, counts: e.target.value})} required /></div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Фильтр</label>
                  <select value={productForm.filter_id?._id || productForm.filter_id || ''} onChange={(e) => setProductForm({...productForm, filter_id: e.target.value})}>
                    <option value="">Без фильтра</option>
                    {filters.map(f => <option key={f._id} value={f._id}>{f.name.ru || f.name.en}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Ссылка</label>
                <input type="url" placeholder="https://..." value={productForm.link || ''} onChange={(e) => setProductForm({...productForm, link: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Опт. цена ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="—" value={productForm.wholesale_price ?? ''} onChange={(e) => setProductForm({...productForm, wholesale_price: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Кол-во для опта</label>
                  <input type="number" min="0" placeholder="—" value={productForm.count_for_wholesale ?? ''} onChange={(e) => setProductForm({...productForm, count_for_wholesale: e.target.value})} />
                </div>
              </div>
              <ImageUploadInput
                file={imageFile}
                onChange={setImageFile}
                currentImageUrl={editingProduct?.path_image}
                label="Изображение"
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>Отмена</button>
                <button type="submit" style={{ flex: 1 }}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmNode}

      {/* Digital Inventory Modal */}
      {inventoryProduct && (
        <DigitalInventoryModal
          product={inventoryProduct.product}
          productType={inventoryProduct.productType}
          onClose={() => setInventoryProduct(null)}
          onCountsChanged={(newCount) => {
            setProducts((prev) =>
              prev.map((p) =>
                p._id === inventoryProduct.product._id ? { ...p, counts: newCount } : p
              )
            );
          }}
        />
      )}

      {/* Filter Modal (same as before) */}
      {showFilterModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontWeight: '700' }}>Фильтры</h2>
              <button onClick={() => setShowFilterModal(false)} style={{ backgroundColor: 'transparent', padding: '0.5rem', color: '#6b7280' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><input placeholder="Название (РУ)" value={filterForm['name.ru']} onChange={(e) => setFilterForm({...filterForm, 'name.ru': e.target.value})} /></div>
                <div style={{ flex: 1 }}><input placeholder="Название (EN)" value={filterForm['name.en']} onChange={(e) => setFilterForm({...filterForm, 'name.en': e.target.value})} /></div>
                <div style={{ width: '100px' }}><input type="color" value={filterForm.color} onChange={(e) => setFilterForm({...filterForm, color: e.target.value})} style={{ padding: '0.2rem', height: '44px' }} /></div>
              </div>
              <button type="submit" style={{ alignSelf: 'flex-start' }}>{editingFilter ? 'Обновить' : 'Добавить'}</button>
            </form>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {filters.map(f => (
                <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: f.color }} />
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{f.name.ru || f.name.en}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => { setEditingFilter(f); setFilterForm({ 'name.ru': f.name.ru || '', 'name.en': f.name.en || '', color: f.color }); }} style={{ padding: '0.25rem', backgroundColor: 'transparent', color: '#6b7280' }}><Edit2 size={12} /></button>
                    <button onClick={async () => { const ok = await confirm('Удалить фильтр?'); if(ok) { await deleteFilter(f._id); fetchFilters(); toast.success('Фильтр удалён'); } }} style={{ padding: '0.25rem', backgroundColor: 'transparent', color: '#ef4444' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
