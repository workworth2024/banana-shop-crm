import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Edit2, Trash2, Youtube, Globe, Filter as FilterIcon, 
  ChevronLeft, ChevronRight, Package, Image as ImageIcon, X, Check, Copy,
  Settings2, Calendar, MapPin, ChevronDown, ChevronUp
} from 'lucide-react';
import { getFilters, createFilter, updateFilter, deleteFilter, getYoutubeProducts, getGoogleAdsProducts, saveProduct, deleteProduct } from '../api/products';
import { getTemplates } from '../api/templates';
import { getServices } from '../api/services';
import { useAuthStore } from '../stores/authStore';
import countries from '../utils/countries.json';
import ACCOUNT_TYPES from '../constants/accountTypes';
import { useConfirm } from '../components/ConfirmDialog';
import { ImageUploadInput } from '../components/FileUploadInput';
import DigitalInventoryModal from '../components/DigitalInventoryModal';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '../utils/mediaUrl';

function localYMD(d) {
  const z = new Date(d);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const DetailField = ({ label, value, pre = false }) => (
  <div style={{ background: '#fff', border: '1px solid #eef0f4', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
    <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontSize: '0.82rem', color: '#374151', whiteSpace: pre ? 'pre-wrap' : 'normal', wordBreak: 'break-word' }}>
      {value !== undefined && value !== null && String(value).trim() !== '' ? value : '—'}
    </div>
  </div>
);

const Products = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'google-ads' || searchParams.get('tab') === 'youtube')
    ? searchParams.get('tab')
    : 'youtube';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [availablePayments, setAvailablePayments] = useState([]);
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [formStep, setFormStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
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
    counts: 100,
    price: 100,
    filter: 150,
    tiers: 160
  });

  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
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

  const ClickableCell = ({ children, text, style = {}, cellId }) => (
    <td 
      onClick={() => copyToClipboard(text || children?.toString() || '', cellId)}
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

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

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
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(currentPage));
      queryParams.set('limit', String(pageSize));
      if (debouncedSearch) queryParams.set('search', debouncedSearch);
      if (selectedFilter) queryParams.set('filter', selectedFilter);
      if (selectedType) queryParams.set('type', selectedType);
      if (selectedGeo) queryParams.set('geo', selectedGeo);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const data = await (activeTab === 'youtube' ? getYoutubeProducts(queryParams) : getGoogleAdsProducts(queryParams));
      setProducts(data.products);
      setTotal(data.total);
      setPages(Math.max(1, data.pages || 1));
      if (activeTab === 'google-ads') {
        setAvailablePayments(Array.isArray(data.availablePayments) ? data.availablePayments : []);
        setAvailableFeatures(Array.isArray(data.availableFeatures) ? data.availableFeatures : []);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, debouncedSearch, selectedFilter, selectedType, selectedGeo, startDate, endDate]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    getTemplates()
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
    const sp = new URLSearchParams();
    sp.set('page', '1');
    sp.set('limit', '100');
    getServices(sp)
      .then(data => setServices(Array.isArray(data?.services) ? data.services : (Array.isArray(data) ? data : [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedFilter, selectedType, selectedGeo, startDate, endDate, pageSize, activeTab]);

  useEffect(() => {
    setCurrentPage((p) => (pages >= 1 && p > pages ? pages : p));
  }, [pages]);

  const applyDatePreset = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      const d = localYMD(today);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === '7d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setStartDate(localYMD(start));
      setEndDate(localYMD(today));
    } else if (preset === '30d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      setStartDate(localYMD(start));
      setEndDate(localYMD(today));
    }
    setCurrentPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedFilter('');
    setSelectedType('');
    setSelectedGeo('');
    setStartDate('');
    setEndDate('');
  };

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      const geosArr = Array.isArray(product.geos) && product.geos.length
        ? product.geos.map(g => ({ code: g.code, counts: Number(g.counts) || 0 }))
        : (product.geo ? [{ code: product.geo, counts: Number(product.counts) || 0 }] : []);
      setProductForm({
        type: product.type,
        'title.ru': product.title?.ru || '',
        'title.en': product.title?.en || '',
        'sub_title.ru': product.sub_title?.ru || '',
        'sub_title.en': product.sub_title?.en || '',
        'desc.ru': product.desc?.ru || '',
        'desc.en': product.desc?.en || '',
        price: product.price,
        filter_id: product.filter_id,
        geos: geosArr,
        path_image: product.path_image,
        price_tiers: Array.isArray(product.price_tiers)
          ? product.price_tiers.map(t => ({ min_qty: t.min_qty, price: t.price }))
          : [],
        'payment.ru': product.payment?.ru || '',
        'payment.en': product.payment?.en || '',
        features: Array.isArray(product.features)
          ? product.features.map(f => ({ ru: f.ru || '', en: f.en || '' }))
          : [],
        templateIds: Array.isArray(product.templateIds)
          ? product.templateIds.map(t => (t && t._id) ? t._id : t)
          : [],
        serviceIds: Array.isArray(product.serviceIds)
          ? product.serviceIds.map(s => (s && s._id) ? s._id : s)
          : []
      });
      setGeoSearch('');
    } else {
      setEditingProduct(null);
      setProductForm(activeTab === 'youtube'
        ? { type: 'item', 'title.ru': '', 'title.en': '', 'desc.ru': '', 'desc.en': '', price: 0, filter_id: '', geos: [], price_tiers: [] }
        : { type: '', 'title.ru': '', 'title.en': '', 'sub_title.ru': '', 'sub_title.en': '', 'desc.ru': '', 'desc.en': '', price: 0, filter_id: '', geos: [], price_tiers: [], 'payment.ru': '', 'payment.en': '', features: [], templateIds: [], serviceIds: [] }
      );
      setGeoSearch('');
    }
    setImageFile(null);
    setFormStep(0);
    setShowProductModal(true);
  };

  const toggleRowExpand = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addGeoRow = (code) => {
    setProductForm(prev => {
      const geos = Array.isArray(prev.geos) ? prev.geos : [];
      if (geos.some(g => g.code === code)) return prev;
      return { ...prev, geos: [...geos, { code, counts: 0 }] };
    });
  };

  const removeGeoRow = (code) => {
    setProductForm(prev => ({
      ...prev,
      geos: (prev.geos || []).filter(g => g.code !== code)
    }));
  };

  const addFeatureRow = () => {
    setProductForm(prev => ({
      ...prev,
      features: [...(prev.features || []), { ru: '', en: '' }]
    }));
  };

  const updateFeatureRow = (idx, lang, value) => {
    setProductForm(prev => ({
      ...prev,
      features: (prev.features || []).map((f, i) => i === idx ? { ...f, [lang]: value } : f)
    }));
  };

  const removeFeatureRow = (idx) => {
    setProductForm(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== idx)
    }));
  };

  const addTierRow = () => {
    setProductForm(prev => {
      const tiers = Array.isArray(prev.price_tiers) ? prev.price_tiers : [];
      const lastQty = tiers.length ? Number(tiers[tiers.length - 1].min_qty) || 0 : 1;
      return { ...prev, price_tiers: [...tiers, { min_qty: lastQty + 1, price: '' }] };
    });
  };

  const updateTierRow = (idx, field, value) => {
    setProductForm(prev => ({
      ...prev,
      price_tiers: (prev.price_tiers || []).map((t, i) => i === idx ? { ...t, [field]: value } : t)
    }));
  };

  const removeTierRow = (idx) => {
    setProductForm(prev => ({
      ...prev,
      price_tiers: (prev.price_tiers || []).filter((_, i) => i !== idx)
    }));
  };

  const validatePriceTiers = (tiers, basePrice) => {
    const base = parseFloat(basePrice) || 0;
    let prevQty = 1;
    let prevPrice = base;
    for (let i = 0; i < tiers.length; i++) {
      const qty = parseInt(tiers[i].min_qty, 10);
      const price = parseFloat(tiers[i].price);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) {
        return `Уровень ${i + 1}: заполните количество и цену`;
      }
      if (qty <= prevQty) {
        return `Уровень ${i + 1}: количество должно быть больше, чем у уровня ${i} (${prevQty})`;
      }
      if (price < 0 || price >= prevPrice) {
        return `Уровень ${i + 1}: цена должна быть меньше, чем у уровня ${i} ($${prevPrice})`;
      }
      prevQty = qty;
      prevPrice = price;
    }
    return null;
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (formStep < formStepKeys.length - 1) {
      setFormStep(formStep + 1);
      return;
    }
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
      formData.append('payment.ru', productForm['payment.ru'] || '');
      formData.append('payment.en', productForm['payment.en'] || '');
      const featuresClean = (productForm.features || [])
        .map(f => ({ ru: String(f.ru || '').trim(), en: String(f.en || '').trim() }))
        .filter(f => f.ru || f.en);
      formData.append('features', JSON.stringify(featuresClean));
      formData.append('templateIds', JSON.stringify(productForm.templateIds || []));
      formData.append('serviceIds', JSON.stringify(productForm.serviceIds || []));
    }
    
    formData.append('price', productForm.price);
    const geosClean = (productForm.geos || [])
      .filter(g => g && g.code)
      .map(g => ({ code: String(g.code).toUpperCase(), counts: Math.max(0, parseInt(g.counts, 10) || 0) }));
    if (geosClean.length === 0) {
      toast.error('Добавьте хотя бы одно гео');
      return;
    }
    formData.append('geos', JSON.stringify(geosClean));

    const tiers = productForm.price_tiers || [];
    const tiersError = validatePriceTiers(tiers, productForm.price);
    if (tiersError) {
      toast.error(tiersError);
      return;
    }
    const tiersClean = tiers.map(t => ({
      min_qty: parseInt(t.min_qty, 10),
      price: parseFloat(t.price)
    }));
    formData.append('price_tiers', JSON.stringify(tiersClean));
    
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

  const isGoogleAds = activeTab === 'google-ads';
  const formStepKeys = isGoogleAds
    ? ['basic', 'pricing', 'extra', 'geo', 'image']
    : ['basic', 'pricing', 'geo', 'image'];
  const formStepLabels = {
    basic: 'Основное',
    pricing: 'Цены и фильтр',
    extra: 'Платёжка · особенности · шаблоны',
    geo: 'ГЕО и наличие',
    image: 'Изображение'
  };
  const currentStepKey = formStepKeys[Math.min(formStep, formStepKeys.length - 1)];

  return (
    <div className="orders-page products-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            <Calendar size={16} />
            <span>Период (дата добавления товара):</span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => applyDatePreset('today')}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: '600', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '8px', cursor: 'pointer' }}
            >
              Новые за сегодня
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('7d')}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: '600', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer' }}
            >
              За 7 дней
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('30d')}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: '600', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', borderRadius: '8px', cursor: 'pointer' }}
            >
              За 30 дней
            </button>
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
              <th style={{ width: '44px', padding: '1rem 0.5rem' }} />
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
              <th style={{ width: `${columnWidths.counts}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Кол-во <Resizer onResize={(w) => handleResize('counts', w)} />
              </th>
              <th style={{ width: `${columnWidths.price}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Цена <Resizer onResize={(w) => handleResize('price', w)} />
              </th>
              <th style={{ width: `${columnWidths.filter}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Фильтр <Resizer onResize={(w) => handleResize('filter', w)} />
              </th>
              <th style={{ width: `${columnWidths.tiers}px`, padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', position: 'relative' }}>
                Опт. уровни <Resizer onResize={(w) => handleResize('tiers', w)} />
              </th>
              <th style={{ width: '120px', padding: '1rem 1.5rem', textAlign: 'right', position: 'sticky', right: 0, background: '#f9fafb', zIndex: 3, boxShadow: '-2px 0 6px rgba(0,0,0,0.06)' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="20" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="20" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Товары не найдены</td></tr>
            ) : products.map(p => {
              const productGeos = Array.isArray(p.geos) && p.geos.length
                ? p.geos
                : (p.geo ? [{ code: p.geo, counts: p.counts || 0 }] : []);
              const geoCodesText = productGeos.map(g => g.code).join(', ');
              const totalCounts = productGeos.reduce((s, g) => s + (Number(g.counts) || 0), 0);
              const isExpanded = expandedRows.has(p._id);
              return (
              <React.Fragment key={p._id}>
              <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6', background: isExpanded ? '#fafafe' : 'transparent' }}>
                <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                  <button type="button" onClick={() => toggleRowExpand(p._id)} title={isExpanded ? 'Свернуть' : 'Развернуть'} style={{ padding: '0.35rem', background: isExpanded ? '#eef2ff' : '#f3f4f6', color: '#4b5563', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </td>
                <ClickableCell text={p.uid || String(p._id)} cellId={p._id} style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>{p.uid || p._id.slice(-6)}</span>
                    {copiedId === p._id
                      ? <Check size={12} style={{ color: '#059669', flexShrink: 0 }} />
                      : <Copy size={12} style={{ color: '#d1d5db', flexShrink: 0 }} />
                    }
                  </div>
                </ClickableCell>
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
                <ClickableCell text={geoCodesText}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <MapPin size={14} color="var(--primary)" />
                    {productGeos.length === 0 ? (
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>—</span>
                    ) : (
                      productGeos.map(g => (
                        <span key={g.code} title={`${g.code}: ${g.counts} шт.`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', fontSize: '0.72rem', fontWeight: '700', background: '#eef2ff', color: '#4338ca', borderRadius: '6px' }}>
                          {g.code} <span style={{ color: '#6366f1', fontWeight: '600' }}>· {g.counts}</span>
                        </span>
                      ))
                    )}
                  </div>
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                    {p.path_image ? <img src={resolveMediaUrl(p.path_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color="#9ca3af" />}
                  </div>
                </td>
                <ClickableCell text={p.title?.ru || p.title?.en || ''} style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{p.title?.ru || p.title?.en || ''}</ClickableCell>
                {activeTab === 'google-ads' && <ClickableCell text={p.sub_title?.ru || p.sub_title?.en || ''} style={{ fontSize: '0.875rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sub_title?.ru || p.sub_title?.en || '—'}</ClickableCell>}
                <ClickableCell text={p.desc?.ru || p.desc?.en || ''} style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc?.ru || p.desc?.en || ''}</ClickableCell>
                <ClickableCell text={String(totalCounts)}>
                   <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', backgroundColor: totalCounts > 0 ? '#ecfdf5' : '#fef2f2', color: totalCounts > 0 ? '#059669' : '#dc2626', fontSize: '0.75rem', fontWeight: '700' }}>
                     {totalCounts} шт.
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
                <ClickableCell
                  text={(p.price_tiers || []).map(t => `${t.min_qty}+: $${t.price}`).join(', ')}
                  style={{ fontWeight: '600', color: '#7c3aed' }}
                >
                  {Array.isArray(p.price_tiers) && p.price_tiers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {p.price_tiers.map((t, i) => (
                        <span key={i} style={{ fontSize: '0.72rem' }}>от {t.min_qty} шт. — ${t.price}</span>
                      ))}
                    </div>
                  ) : '—'}
                </ClickableCell>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', position: 'sticky', right: 0, background: 'white', zIndex: 2, boxShadow: '-2px 0 6px rgba(0,0,0,0.06)' }}>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setInventoryProduct({ product: p, productType: activeTab === 'youtube' ? 'YoutubeProduct' : 'GoogleAdsProduct' })} style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Файлы / Инвентарь">
                        <Package size={16} />
                      </button>
                      <button onClick={() => openProductModal(p)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Редактировать">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteProduct(p._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              {isExpanded && (
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#fafafe' }}>
                  <td colSpan={20} style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      <DetailField label="Название (RU)" value={p.title?.ru} />
                      <DetailField label="Название (EN)" value={p.title?.en} />
                      {activeTab === 'google-ads' && <DetailField label="Подзаголовок (RU)" value={p.sub_title?.ru} />}
                      {activeTab === 'google-ads' && <DetailField label="Подзаголовок (EN)" value={p.sub_title?.en} />}
                      <DetailField label="Описание (RU)" value={p.desc?.ru} pre />
                      <DetailField label="Описание (EN)" value={p.desc?.en} pre />
                      {activeTab === 'google-ads' && <DetailField label="Платёжка (RU)" value={p.payment?.ru} />}
                      {activeTab === 'google-ads' && <DetailField label="Платёжка (EN)" value={p.payment?.en} />}
                      {activeTab === 'google-ads' && (
                        <DetailField label="Особенности" value={(p.features || []).map(f => f.ru || f.en).filter(Boolean).join(', ')} />
                      )}
                      {activeTab === 'google-ads' && (
                        <DetailField label="Шаблоны" value={(p.templateIds || []).map(t => {
                          if (t && (t.title?.ru || t.title?.en)) return t.title?.ru || t.title?.en;
                          const id = (t && t._id) ? t._id : t;
                          const found = templates.find(x => x._id === id);
                          return found ? (found.title?.ru || found.title?.en || found.uid) : null;
                        }).filter(Boolean).join(', ')} />
                      )}
                      {activeTab === 'google-ads' && (
                        <DetailField label="Услуги" value={(p.serviceIds || []).map(s => {
                          if (s && (s.title?.ru || s.title?.en)) return s.title?.ru || s.title?.en;
                          const id = (s && s._id) ? s._id : s;
                          const found = services.find(x => x._id === id);
                          return found ? (found.title?.ru || found.title?.en || found.uid) : null;
                        }).filter(Boolean).join(', ')} />
                      )}
                      <DetailField label="ГЕО (детально)" value={productGeos.map(g => `${g.code}: ${g.counts}`).join(', ')} />
                      <DetailField label="Цена" value={`$${p.price}`} />
                      <DetailField
                        label="Опт. уровни"
                        value={
                          Array.isArray(p.price_tiers) && p.price_tiers.length > 0
                            ? p.price_tiers.map((t, i) => `Ур.${i + 1}: от ${t.min_qty} шт. — $${t.price}`).join('; ')
                            : '—'
                        }
                      />
                      <DetailField label="Фильтр" value={p.filter_id ? (p.filter_id.name?.ru || p.filter_id.name?.en) : '—'} />
                      <DetailField label="Ссылка" value={p.link} />
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div>
              Всего в базе: <b>{total}</b> товаров
              {!loading && total > 0 && (
                <>
                  {' '}
                  · на странице{' '}
                  <b>{(currentPage - 1) * pageSize + 1}</b>
                  –
                  <b>{Math.min(currentPage * pageSize, total)}</b>
                </>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', maxWidth: '420px' }}>
              Списком грузится только выбранная страница (не все {total}+ позиций сразу). Лимит на сервере — до 100 строк за запрос.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#4b5563' }}>
              На странице
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontWeight: '600' }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button disabled={currentPage === 1} type="button" onClick={() => setCurrentPage(p => p - 1)} style={{ opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={18} /></button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600', minWidth: '5rem', justifyContent: 'center' }}>{currentPage} / {pages}</div>
              <button disabled={currentPage >= pages} type="button" onClick={() => setCurrentPage(p => p + 1)} style={{ opacity: currentPage >= pages ? 0.5 : 1 }}><ChevronRight size={18} /></button>
            </div>
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
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                {formStepKeys.map((key, idx) => {
                  const active = idx === formStep;
                  const done = idx < formStep;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormStep(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.4rem 0.7rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 600,
                        background: active ? 'var(--primary)' : done ? '#ecfdf5' : '#f3f4f6',
                        color: active ? '#fff' : done ? '#059669' : '#6b7280'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.25)' : done ? '#059669' : '#d1d5db', color: active ? '#fff' : '#fff', fontSize: '0.7rem' }}>
                        {done ? <Check size={11} /> : idx + 1}
                      </span>
                      {formStepLabels[key]}
                    </button>
                  );
                })}
              </div>
              {currentStepKey === 'basic' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Название *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="text" placeholder="Русский" value={productForm['title.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'title.ru': e.target.value})} style={{ flex: 1 }} />
                  <input type="text" placeholder="English" value={productForm['title.en'] || ''} onChange={(e) => setProductForm({...productForm, 'title.en': e.target.value})} style={{ flex: 1 }} />
                </div>
              </div>
              )}
              {currentStepKey === 'basic' && (
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
              )}
              {activeTab === 'google-ads' && currentStepKey === 'basic' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Подзаголовок</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input type="text" placeholder="Русский" value={productForm['sub_title.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'sub_title.ru': e.target.value})} style={{ flex: 1 }} />
                    <input type="text" placeholder="English" value={productForm['sub_title.en'] || ''} onChange={(e) => setProductForm({...productForm, 'sub_title.en': e.target.value})} style={{ flex: 1 }} />
                  </div>
                </div>
              )}
              {activeTab === 'google-ads' && currentStepKey === 'extra' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Платёжка</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input type="text" list="ga-payments-ru" placeholder="Русский (напр. IBAN)" value={productForm['payment.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'payment.ru': e.target.value})} style={{ flex: 1 }} />
                    <input type="text" list="ga-payments-en" placeholder="English (e.g. IBAN)" value={productForm['payment.en'] || ''} onChange={(e) => setProductForm({...productForm, 'payment.en': e.target.value})} style={{ flex: 1 }} />
                  </div>
                  <datalist id="ga-payments-ru">
                    {[...new Set(availablePayments.map(p => p.ru).filter(Boolean))].map((v, i) => <option key={i} value={v} />)}
                  </datalist>
                  <datalist id="ga-payments-en">
                    {[...new Set(availablePayments.map(p => p.en).filter(Boolean))].map((v, i) => <option key={i} value={v} />)}
                  </datalist>
                </div>
              )}
              {activeTab === 'google-ads' && currentStepKey === 'extra' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Особенности</label>
                    <button type="button" onClick={addFeatureRow} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                      <Plus size={13} /> Добавить
                    </button>
                  </div>
                  {(productForm.features || []).length === 0 && (
                    <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>Нет особенностей. Напр.: «Верифицирован», «Со спендом».</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {(productForm.features || []).map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="text" list="ga-features-ru" placeholder="Русский" value={f.ru || ''} onChange={(e) => updateFeatureRow(idx, 'ru', e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                        <input type="text" list="ga-features-en" placeholder="English" value={f.en || ''} onChange={(e) => updateFeatureRow(idx, 'en', e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                        <button type="button" onClick={() => removeFeatureRow(idx)} style={{ padding: '0.35rem 0.55rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Удалить">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <datalist id="ga-features-ru">
                    {[...new Set(availableFeatures.map(f => f.ru).filter(Boolean))].map((v, i) => <option key={i} value={v} />)}
                  </datalist>
                  <datalist id="ga-features-en">
                    {[...new Set(availableFeatures.map(f => f.en).filter(Boolean))].map((v, i) => <option key={i} value={v} />)}
                  </datalist>
                </div>
              )}
              {activeTab === 'google-ads' && currentStepKey === 'extra' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Шаблоны (правила / что входит)</label>
                  <input
                    type="text"
                    placeholder="Поиск шаблонов..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                  />
                  {(productForm.templateIds || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      {(productForm.templateIds || []).map(id => {
                        const tpl = templates.find(t => t._id === id);
                        if (!tpl) return null;
                        const label = tpl.title?.ru || tpl.title?.en || tpl.uid;
                        return (
                          <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', background: '#ecfdf5', color: '#059669', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                            {label}
                            <button type="button" onClick={() => setProductForm(prev => ({ ...prev, templateIds: (prev.templateIds || []).filter(t => t !== id) }))} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                              <X size={13} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    {templates
                      .filter(t => {
                        const q = templateSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (t.title?.ru || '').toLowerCase().includes(q)
                          || (t.title?.en || '').toLowerCase().includes(q)
                          || (t.content?.ru || '').toLowerCase().includes(q)
                          || (t.content?.en || '').toLowerCase().includes(q);
                      })
                      .map(t => {
                        const checked = (productForm.templateIds || []).includes(t._id);
                        const label = t.title?.ru || t.title?.en || t.uid;
                        return (
                          <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setProductForm(prev => {
                                const cur = prev.templateIds || [];
                                return { ...prev, templateIds: checked ? cur.filter(id => id !== t._id) : [...cur, t._id] };
                              })}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    {templates.length === 0 && (
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, padding: '0.6rem' }}>Нет шаблонов. Создайте их во вкладке «Шаблоны».</p>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'google-ads' && currentStepKey === 'extra' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Услуги (доп. предложения)</label>
                  <input
                    type="text"
                    placeholder="Поиск услуг..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                  />
                  {(productForm.serviceIds || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      {(productForm.serviceIds || []).map(id => {
                        const svc = services.find(s => s._id === id);
                        if (!svc) return null;
                        const label = svc.title?.ru || svc.title?.en || svc.uid;
                        return (
                          <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', background: '#eff6ff', color: '#2563eb', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                            {label}
                            <button type="button" onClick={() => setProductForm(prev => ({ ...prev, serviceIds: (prev.serviceIds || []).filter(s => s !== id) }))} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                              <X size={13} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    {services
                      .filter(s => {
                        const q = serviceSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (s.title?.ru || '').toLowerCase().includes(q)
                          || (s.title?.en || '').toLowerCase().includes(q);
                      })
                      .map(s => {
                        const checked = (productForm.serviceIds || []).includes(s._id);
                        const label = s.title?.ru || s.title?.en || s.uid;
                        return (
                          <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setProductForm(prev => {
                                const cur = prev.serviceIds || [];
                                return { ...prev, serviceIds: checked ? cur.filter(id => id !== s._id) : [...cur, s._id] };
                              })}
                            />
                            <span>{label}{typeof s.price !== 'undefined' ? ` — $${s.price}` : ''}</span>
                          </label>
                        );
                      })}
                    {services.length === 0 && (
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, padding: '0.6rem' }}>Нет услуг. Создайте их во вкладке «Услуги».</p>
                    )}
                  </div>
                </div>
              )}
              {currentStepKey === 'basic' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Описание *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea placeholder="Русский" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={productForm['desc.ru'] || ''} onChange={(e) => setProductForm({...productForm, 'desc.ru': e.target.value})} />
                  <textarea placeholder="English" style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit', flex: 1 }} value={productForm['desc.en'] || ''} onChange={(e) => setProductForm({...productForm, 'desc.en': e.target.value})} />
                </div>
              </div>
              )}

              {currentStepKey === 'geo' && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '700', color: 'var(--primary)' }}>ГЕО товара (несколько)</label>

                {(productForm.geos || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {(productForm.geos || []).map(g => {
                      const country = countries.find(c => c.code === g.code);
                      return (
                        <div key={g.code} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                          <MapPin size={14} color="var(--primary)" />
                          <div style={{ flex: 1, fontSize: '0.82rem' }}>
                            <strong>{g.code}</strong> <span style={{ color: '#6b7280' }}>{country?.ruName || ''}</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#6b7280' }} title="Количество определяется загруженными товарами">В наличии: <strong style={{ color: 'var(--primary)' }}>{g.counts}</strong></span>
                          <button type="button" onClick={() => removeGeoRow(g.code)} style={{ padding: '0.35rem 0.55rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Удалить">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Поиск страны для добавления..."
                    value={geoSearch}
                    onChange={(e) => setGeoSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                  />
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.5rem',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                  border: '1px solid #f3f4f6',
                  borderRadius: '10px'
                }}>
                  {countries.filter(c =>
                    !(productForm.geos || []).some(g => g.code === c.code) && (
                      c.name.toLowerCase().includes(geoSearch.toLowerCase()) ||
                      c.ruName.toLowerCase().includes(geoSearch.toLowerCase()) ||
                      c.code.toLowerCase().includes(geoSearch.toLowerCase())
                    )
                  ).map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => addGeoRow(c.code)}
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#f9fafb',
                        color: 'var(--text-main)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: '700' }}>+ {c.code}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{c.ruName}</div>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {currentStepKey === 'pricing' && (
              <>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Цена ($)</label><input type="number" step="0.01" value={productForm.price || 0} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required /></div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Фильтр</label>
                  <select value={productForm.filter_id?._id || productForm.filter_id || ''} onChange={(e) => setProductForm({...productForm, filter_id: e.target.value})}>
                    <option value="">Без фильтра</option>
                    {filters.map(f => <option key={f._id} value={f._id}>{f.name.ru || f.name.en}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Опт. уровни цен</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 0.8rem', background: '#f9fafb', border: '1px solid #eef0f4', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', width: '90px', flexShrink: 0 }}>Уровень 0</span>
                    <span style={{ fontSize: '0.8125rem', color: '#9ca3af', width: '110px', flexShrink: 0 }}>от 1 шт.</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>${productForm.price || 0} (базовая цена)</span>
                  </div>
                  {(productForm.price_tiers || []).map((t, idx) => {
                    const rowError = validatePriceTiers((productForm.price_tiers || []).slice(0, idx + 1), productForm.price);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', width: '90px', flexShrink: 0 }}>Уровень {idx + 1}</span>
                          <input
                            type="number"
                            min="2"
                            step="1"
                            placeholder="Кол-во от"
                            value={t.min_qty}
                            onChange={(e) => updateTierRow(idx, 'min_qty', e.target.value)}
                            style={{ width: '110px', flexShrink: 0 }}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Цена ($)"
                            value={t.price}
                            onChange={(e) => updateTierRow(idx, 'price', e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button type="button" onClick={() => removeTierRow(idx)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Удалить уровень">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {rowError && (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444', marginLeft: '102px' }}>{rowError}</span>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" onClick={addTierRow} style={{ alignSelf: 'flex-start', padding: '0.5rem 0.9rem', backgroundColor: '#eef2ff', color: '#4338ca', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus size={14} /> Добавить уровень
                  </button>
                </div>
              </div>
              </>
              )}
              {currentStepKey === 'image' && (
              <ImageUploadInput
                file={imageFile}
                onChange={setImageFile}
                currentImageUrl={editingProduct?.path_image}
                label="Изображение"
              />
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
                {formStep > 0 ? (
                  <button type="button" onClick={() => setFormStep(formStep - 1)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>← Назад</button>
                ) : (
                  <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>Отмена</button>
                )}
                {formStep < formStepKeys.length - 1 ? (
                  <button type="button" onClick={() => setFormStep(formStep + 1)} style={{ flex: 1 }}>Далее →</button>
                ) : (
                  <button type="submit" style={{ flex: 1 }}>Сохранить</button>
                )}
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
