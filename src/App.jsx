import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const SHOP_NAME = "Nelson Stock Pro";
const ADMIN_PIN = "0987";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [products, setProducts] = useState(() => {
    const savedProducts = localStorage.getItem("products");
    return savedProducts ? JSON.parse(savedProducts) : [];
  });

  const [sales, setSales] = useState(() => {
    const savedSales = localStorage.getItem("sales");
    return savedSales ? JSON.parse(savedSales) : [];
  });

  const [workers, setWorkers] = useState(() => {
    const savedWorkers = localStorage.getItem("workers");
    return savedWorkers ? JSON.parse(savedWorkers) : [];
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    stock: "",
    buyingPrice: "",
    sellingPrice: "",
  });

  const [editProduct, setEditProduct] = useState({
    originalName: "",
    name: "",
    category: "",
    stock: "",
    buyingPrice: "",
    sellingPrice: "",
  });

  const [sale, setSale] = useState({
    category: "",
    product: "",
    quantity: "",
    sellingPrice: "",
    paymentMethod: "Cash",
    soldBy: "",
  });

  const [productFilterCategory, setProductFilterCategory] = useState("");

  const [stockUpdate, setStockUpdate] = useState({
    product: "",
    mode: "add",
    quantity: "",
  });

  const [newWorker, setNewWorker] = useState("");

  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });

  const [pinInput, setPinInput] = useState("");

  const formatProductFromSupabase = (product) => ({
    name: product.name,
    category: product.category || "General",
    stock: Number(product.stock || 0),
    buyingPrice: Number(product.buying_price || 0),
    sellingPrice: Number(product.selling_price || 0),
  });

  const formatSaleFromSupabase = (saleItem) => ({
    id: saleItem.id,
    product: saleItem.product,
    quantity: Number(saleItem.quantity || 0),
    sellingPrice: Number(saleItem.selling_price || 0),
    paymentMethod: saleItem.payment_method,
    soldBy: saleItem.sold_by,
    total: Number(saleItem.total || 0),
    profit: Number(saleItem.profit || 0),
    date: saleItem.sale_date,
    time: saleItem.sale_time,
  });

  const loadDataFromSupabase = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (!productsError && productsData) {
      setProducts(productsData.map(formatProductFromSupabase));
    }

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: true });

    if (!salesError && salesData) {
      setSales(salesData.map(formatSaleFromSupabase));
    }

    const { data: workersData, error: workersError } = await supabase
      .from("workers")
      .select("*")
      .order("name", { ascending: true });

    if (!workersError && workersData) {
      setWorkers(workersData);
    }
  };

  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("sales", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem("workers", JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    loadDataFromSupabase();

    const channel = supabase
      .channel("nelson-stock-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => loadDataFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => loadDataFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workers" },
        () => loadDataFromSupabase()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unlockAdmin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      localStorage.setItem("isAdmin", "true");
      setPinInput("");
      alert("Admin mode unlocked ✅");
    } else {
      alert("Wrong PIN");
    }
  };

  const lockAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem("isAdmin");
    alert("Admin mode locked");
  };

  const addWorker = async () => {
    const workerName = newWorker.trim();

    if (!workerName) {
      return alert("Enter worker name");
    }

    const workerExists = workers.some(
      (worker) => worker.name.toLowerCase() === workerName.toLowerCase()
    );

    if (workerExists) {
      return alert("Worker already exists");
    }

    const { error } = await supabase.from("workers").insert({
      name: workerName,
    });

    if (error) {
      alert("Worker failed to save: " + error.message);
      return;
    }

    setNewWorker("");
    alert("Worker added ✅");
  };

  const deleteWorker = async (workerId, workerName) => {
    const confirmDelete = confirm(`Delete worker ${workerName}?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("workers").delete().eq("id", workerId);

    if (error) {
      alert("Worker delete failed: " + error.message);
      return;
    }

    setWorkers(workers.filter((worker) => worker.id !== workerId));
  };

  const addProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.stock ||
      !newProduct.buyingPrice ||
      !newProduct.sellingPrice
    ) {
      return alert("Fill all product details");
    }

    const productExists = products.some(
      (p) => p.name.toLowerCase() === newProduct.name.toLowerCase()
    );

    if (productExists) {
      return alert("This product already exists");
    }

    const { error } = await supabase.from("products").upsert(
      {
        name: newProduct.name.trim(),
        category: newProduct.category.trim() || "General",
        stock: Number(newProduct.stock),
        buying_price: Number(newProduct.buyingPrice),
        selling_price: Number(newProduct.sellingPrice),
      },
      { onConflict: "name" }
    );

    if (error) {
      alert("Product failed to save online: " + error.message);
      return;
    }

    setNewProduct({
      name: "",
      category: "",
      stock: "",
      buyingPrice: "",
      sellingPrice: "",
    });

    alert("Product saved ✅");
  };

  const startEditProduct = (product) => {
    setEditProduct({
      originalName: product.name,
      name: product.name,
      category: product.category || "General",
      stock: String(product.stock),
      buyingPrice: String(product.buyingPrice),
      sellingPrice: String(product.sellingPrice),
    });
  };

  const cancelEditProduct = () => {
    setEditProduct({
      originalName: "",
      name: "",
      category: "",
      stock: "",
      buyingPrice: "",
      sellingPrice: "",
    });
  };

  const saveEditedProduct = async () => {
    if (
      !editProduct.originalName ||
      !editProduct.name ||
      editProduct.stock === "" ||
      editProduct.buyingPrice === "" ||
      editProduct.sellingPrice === ""
    ) {
      return alert("Fill all edited product details");
    }

    const newName = editProduct.name.trim();

    const duplicateName = products.some(
      (p) =>
        p.name.toLowerCase() === newName.toLowerCase() &&
        p.name.toLowerCase() !== editProduct.originalName.toLowerCase()
    );

    if (duplicateName) {
      return alert("Another product already has this name");
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: newName,
        category: editProduct.category.trim() || "General",
        stock: Number(editProduct.stock),
        buying_price: Number(editProduct.buyingPrice),
        selling_price: Number(editProduct.sellingPrice),
      })
      .eq("name", editProduct.originalName);

    if (error) {
      alert("Product update failed: " + error.message);
      return;
    }

    cancelEditProduct();
    alert("Product updated ✅");
  };

  const updateStock = async () => {
    const product = products.find((p) => p.name === stockUpdate.product);

    if (!product) {
      return alert("Choose a product first");
    }

    const quantity = Number(stockUpdate.quantity);

    if (stockUpdate.quantity === "" || quantity < 0) {
      return alert("Enter a valid stock number");
    }

    const newStock =
      stockUpdate.mode === "add" ? Number(product.stock) + quantity : quantity;

    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("name", product.name);

    if (error) {
      alert("Stock update failed: " + error.message);
      return;
    }

    setProducts(
      products.map((p) =>
        p.name === product.name ? { ...p, stock: newStock } : p
      )
    );

    setStockUpdate({
      product: "",
      mode: "add",
      quantity: "",
    });

    alert(`Stock updated for ${product.name} ✅`);
  };

  const deleteProduct = async (productName) => {
    const confirmDelete = confirm(`Delete ${productName}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("name", productName);

    if (error) {
      alert("Supabase delete failed: " + error.message);
      return;
    }

    setProducts(products.filter((p) => p.name !== productName));
  };

  const addSale = async () => {
    const product = products.find((p) => p.name === sale.product);
    if (!product) return alert("Choose a product first");

    const quantity = Number(sale.quantity);
    const sellingPrice = Number(sale.sellingPrice);

    if (!sale.category || !quantity || !sellingPrice || !sale.soldBy) {
      return alert(
        "Fill category, product, quantity, selling price, and sold by"
      );
    }

    if (quantity > product.stock) {
      return alert("Not enough stock");
    }

    const newStock = Number(product.stock) - quantity;
    const profit = (sellingPrice - Number(product.buyingPrice)) * quantity;
    const total = sellingPrice * quantity;
    const saleDate = new Date().toLocaleDateString();
    const saleTime = new Date().toLocaleTimeString();

    const { error: saleError } = await supabase.from("sales").insert({
      product: sale.product,
      quantity,
      selling_price: sellingPrice,
      payment_method: sale.paymentMethod,
      sold_by: sale.soldBy,
      total,
      profit,
      sale_date: saleDate,
      sale_time: saleTime,
    });

    if (saleError) {
      alert("Sale failed to save: " + saleError.message);
      return;
    }

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("name", sale.product);

    if (stockError) {
      alert("Sale saved, but stock update failed: " + stockError.message);
      return;
    }

    setSale({
      category: "",
      product: "",
      quantity: "",
      sellingPrice: "",
      paymentMethod: "Cash",
      soldBy: "",
    });

    alert("Sale saved and stock updated ✅");
  };

  const deleteSale = async (saleIndex) => {
    if (!isAdmin) {
      return alert("Admin only");
    }

    const confirmDelete = confirm("Delete this sale?");
    if (!confirmDelete) return;

    const saleToDelete = sales[saleIndex];

    if (saleToDelete?.id) {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleToDelete.id);

      if (error) {
        alert("Supabase delete failed: " + error.message);
        return;
      }
    }

    setSales(sales.filter((_, index) => index !== saleIndex));
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const importProductsFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

      if (lines.length < 2) {
        return alert("CSV file is empty or not formatted correctly");
      }

      const headers = parseCSVLine(lines[0]).map((header) =>
        header.trim().toLowerCase()
      );

      const importedProducts = lines
        .slice(1)
        .map((line) => {
          const values = parseCSVLine(line);
          const row = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          const buyingPrice = Number(row.buyingprice || row.buying_price || 0);
          const sellingPrice = Number(
            row.sellingprice || row.selling_price || buyingPrice
          );

          return {
            name: row.name || row.product || row.productname,
            category: row.category || "General",
            stock: Number(row.stock || row.quantity || 0),
            buyingPrice,
            sellingPrice,
          };
        })
        .filter((product) => product.name);

      if (importedProducts.length === 0) {
        return alert("No valid products found in the CSV");
      }

      setProducts((currentProducts) => {
        const productsMap = new Map();

        currentProducts.forEach((product) => {
          productsMap.set(product.name.toLowerCase(), product);
        });

        importedProducts.forEach((product) => {
          productsMap.set(product.name.toLowerCase(), product);
        });

        return Array.from(productsMap.values());
      });

      alert(`${importedProducts.length} products imported locally`);
      event.target.value = "";
    };

    reader.readAsText(file);
  };

  const downloadCSV = (filename, rows) => {
    if (!rows || rows.length === 0) {
      return alert("No data available to export");
    }

    const headers = Object.keys(rows[0]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            const safeValue = String(value).replaceAll('"', '""');
            return `"${safeValue}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportProductsCSV = () => {
    downloadCSV("nelson_products_backup.csv", products);
  };

  const exportSalesCSV = () => {
    downloadCSV("nelson_sales_backup.csv", sales);
  };

  const testSupabaseConnection = async () => {
    const { error } = await supabase.from("products").select("*").limit(1);

    if (error) {
      alert("Supabase error: " + error.message);
      return;
    }

    alert("Supabase connected successfully ✅");
  };

  const syncProductsToSupabase = async () => {
    if (products.length === 0) {
      return alert("No products to sync");
    }

    const productsToUpload = products.map((product) => ({
      name: product.name,
      category: product.category || "General",
      stock: Number(product.stock || 0),
      buying_price: Number(product.buyingPrice || 0),
      selling_price: Number(product.sellingPrice || 0),
    }));

    const { error } = await supabase
      .from("products")
      .upsert(productsToUpload, { onConflict: "name" });

    if (error) {
      alert("Sync failed: " + error.message);
      return;
    }

    alert(`${products.length} products synced to Supabase ✅`);
  };

  const loadProductsFromSupabase = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      alert("Failed to load products: " + error.message);
      return;
    }

    setProducts(data.map(formatProductFromSupabase));
    alert(`${data.length} products loaded from Supabase ✅`);
  };

  const loadSalesFromSupabase = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      alert("Failed to load sales: " + error.message);
      return;
    }

    setSales(data.map(formatSaleFromSupabase));
    alert(`${data.length} sales loaded from Supabase ✅`);
  };

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((product) => product.category || "General"))
    ).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return sale.category
      ? products.filter(
          (product) => (product.category || "General") === sale.category
        )
      : [];
  }, [products, sale.category]);

  const productsToShow = useMemo(() => {
    return productFilterCategory
      ? products.filter(
          (product) =>
            (product.category || "General") === productFilterCategory
        )
      : products;
  }, [products, productFilterCategory]);

  const totalSales = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  const totalProfit = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.profit, 0);
  }, [sales]);

  const mpesaTotal = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod === "M-Pesa")
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  const cashTotal = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod === "Cash")
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= 5);
  }, [products]);

  const Dashboard = () => (
    <>
      <div className="hero-card">
        <div>
          <p className="muted">{SHOP_NAME}</p>
          <h1>KSh {totalProfit.toLocaleString()}</h1>
          <span className="green-text">▲ Total Profit</span>
        </div>

        <div className="mini-chart">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card pink">
          <p>Today Sales</p>
          <h2>KSh {totalSales.toLocaleString()}</h2>
        </div>

        <div className="stat-card teal">
          <p>Total Products</p>
          <h2>{products.length}</h2>
        </div>

        <div className="stat-card orange">
          <p>Total Orders</p>
          <h2>{sales.length}</h2>
        </div>

        <div className="stat-card danger">
          <p>Low Stock</p>
          <h2>{lowStockProducts.length}</h2>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent Sales</h2>

          <button className="link-btn" onClick={() => setActiveTab("sales")}>
            View all
          </button>
        </div>

        {sales.length === 0 ? (
          <p className="empty">No sales yet</p>
        ) : (
          sales
            .slice(-4)
            .reverse()
            .map((s, index) => (
              <div className="sale-row" key={s.id || index}>
                <div className="item-icon">📦</div>

                <div>
                  <h3>{s.product}</h3>
                  <p>
                    {s.soldBy} • {s.paymentMethod}
                  </p>
                </div>

                <strong>KSh {s.total}</strong>
              </div>
            ))
        )}
      </div>
    </>
  );

  const Products = () => (
    <div className="panel">
      <h2>Products</h2>

      <div className="form-box">
        <h3>Browse by Category</h3>

        <select
          value={productFilterCategory}
          onChange={(e) => setProductFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <p className="import-note">Showing {productsToShow.length} products</p>
      </div>

      {isAdmin && (
        <div className="form-box">
          <h3>Update Stock</h3>

          <select
            value={stockUpdate.product}
            onChange={(e) =>
              setStockUpdate({ ...stockUpdate, product: e.target.value })
            }
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} - Current Stock: {p.stock}
              </option>
            ))}
          </select>

          <div className="payment-buttons">
            <button
              className={
                stockUpdate.mode === "add" ? "pay active mpesa" : "pay"
              }
              type="button"
              onClick={() => setStockUpdate({ ...stockUpdate, mode: "add" })}
            >
              Add Stock
            </button>

            <button
              className={stockUpdate.mode === "set" ? "pay active" : "pay"}
              type="button"
              onClick={() => setStockUpdate({ ...stockUpdate, mode: "set" })}
            >
              Set Exact
            </button>
          </div>

          <input
            type="number"
            inputMode="numeric"
            placeholder={
              stockUpdate.mode === "add"
                ? "Quantity to add"
                : "Set stock to this number"
            }
            value={stockUpdate.quantity}
            onChange={(e) =>
              setStockUpdate({ ...stockUpdate, quantity: e.target.value })
            }
          />

          <button className="primary-btn" type="button" onClick={updateStock}>
            Update Stock
          </button>
        </div>
      )}

      {isAdmin && editProduct.originalName && (
        <div className="form-box">
          <h3>Edit Product</h3>

          <input
            placeholder="Product name"
            value={editProduct.name}
            onChange={(e) =>
              setEditProduct({ ...editProduct, name: e.target.value })
            }
          />

          <input
            placeholder="Category"
            value={editProduct.category}
            onChange={(e) =>
              setEditProduct({ ...editProduct, category: e.target.value })
            }
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder="Stock"
            value={editProduct.stock}
            onChange={(e) =>
              setEditProduct({ ...editProduct, stock: e.target.value })
            }
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder="Buying price"
            value={editProduct.buyingPrice}
            onChange={(e) =>
              setEditProduct({ ...editProduct, buyingPrice: e.target.value })
            }
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder="Selling price"
            value={editProduct.sellingPrice}
            onChange={(e) =>
              setEditProduct({ ...editProduct, sellingPrice: e.target.value })
            }
          />

          <button
            className="primary-btn"
            type="button"
            onClick={saveEditedProduct}
          >
            Save Product Changes
          </button>

          <br />
          <br />

          <button
            className="secondary-btn"
            type="button"
            onClick={cancelEditProduct}
          >
            Cancel Edit
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="form-box">
          <h3>Import Products from CSV</h3>

          <p className="import-note">
            Upload your CSV file with columns: name, category, stock,
            buyingPrice, sellingPrice.
          </p>

          <input
            className="file-input"
            type="file"
            accept=".csv"
            onChange={importProductsFromCSV}
          />
        </div>
      )}

      {isAdmin && (
        <div className="form-box">
          <h3>Backup Data</h3>

          <p className="import-note">
            Download a backup copy of your current products and sales.
          </p>

          <button
            className="primary-btn"
            type="button"
            onClick={exportProductsCSV}
          >
            Export Products CSV
          </button>

          <br />
          <br />

          <button
            className="secondary-btn"
            type="button"
            onClick={exportSalesCSV}
          >
            Export Sales CSV
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="form-box">
          <h3>Add Product</h3>

          <input
            placeholder="Product name"
            autoComplete="off"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
          />

          <input
            placeholder="Category e.g Accessories"
            autoComplete="off"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct({ ...newProduct, category: e.target.value })
            }
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder="Stock quantity"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct({ ...newProduct, stock: e.target.value })
            }
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder="Buying price"
            value={newProduct.buyingPrice}
            onChange={(e) =>
              setNewProduct({ ...newProduct, buyingPrice: e.target.value })
            }
          />

          <input
            type="number"
            inputMode="numeric"
            placeholder="Selling price"
            value={newProduct.sellingPrice}
            onChange={(e) =>
              setNewProduct({ ...newProduct, sellingPrice: e.target.value })
            }
          />

          <button className="primary-btn" type="button" onClick={addProduct}>
            Add Product
          </button>
        </div>
      )}

      {!isAdmin && (
        <p className="import-note">
          Worker mode: you can view products and make sales. Admin controls are
          locked.
        </p>
      )}

      <div className="product-list">
        {productsToShow.map((p) => (
          <div className="product-card" key={p.name}>
            <div className="product-image">📱</div>

            <div className="product-info">
              <h3>{p.name}</h3>
              <p>{p.category || "General"}</p>
              <span>KSh {p.sellingPrice}</span>
            </div>

            <div className={p.stock <= 5 ? "stock-badge low" : "stock-badge"}>
              {p.stock}
            </div>

            {isAdmin && (
              <div className="sale-actions">
                <button type="button" onClick={() => startEditProduct(p)}>
                  Edit
                </button>

                <button type="button" onClick={() => deleteProduct(p.name)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const Sales = () => (
    <div className="panel">
      <h2>New Sale</h2>

      <select
        value={sale.category}
        onChange={(e) =>
          setSale({
            ...sale,
            category: e.target.value,
            product: "",
          })
        }
      >
        <option value="">Select category</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        value={sale.product}
        disabled={!sale.category}
        onChange={(e) => setSale({ ...sale, product: e.target.value })}
      >
        <option value="">
          {sale.category ? "Select product" : "Choose category first"}
        </option>
        {filteredProducts.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name} - Stock: {p.stock}
          </option>
        ))}
      </select>

      <input
        type="number"
        inputMode="numeric"
        placeholder="Quantity sold"
        value={sale.quantity}
        onChange={(e) => setSale({ ...sale, quantity: e.target.value })}
      />

      <input
        type="number"
        inputMode="numeric"
        placeholder="Selling price"
        value={sale.sellingPrice}
        onChange={(e) => setSale({ ...sale, sellingPrice: e.target.value })}
      />

      <select
        value={sale.soldBy}
        onChange={(e) => setSale({ ...sale, soldBy: e.target.value })}
      >
        <option value="">Sold by</option>
        {workers.map((worker) => (
          <option key={worker.id} value={worker.name}>
            {worker.name}
          </option>
        ))}
      </select>

      <div className="payment-buttons">
        <button
          className={sale.paymentMethod === "Cash" ? "pay active" : "pay"}
          type="button"
          onClick={() => setSale({ ...sale, paymentMethod: "Cash" })}
        >
          Cash
        </button>

        <button
          className={
            sale.paymentMethod === "M-Pesa" ? "pay active mpesa" : "pay"
          }
          type="button"
          onClick={() => setSale({ ...sale, paymentMethod: "M-Pesa" })}
        >
          M-Pesa
        </button>
      </div>

      <button className="primary-btn" type="button" onClick={addSale}>
        Complete Sale
      </button>

      <div className="history">
        <h3>Sales History</h3>

        {sales.length === 0 ? (
          <p className="empty">No sales recorded</p>
        ) : (
          sales
            .slice()
            .reverse()
            .map((s, index) => {
              const realIndex = sales.length - 1 - index;

              return (
                <div className="sale-row" key={s.id || realIndex}>
                  <div className="item-icon">✅</div>

                  <div>
                    <h3>{s.product}</h3>
                    <p>
                      Qty {s.quantity} • {s.soldBy} • {s.paymentMethod}
                    </p>
                  </div>

                  <div className="sale-actions">
                    <strong>KSh {s.total}</strong>

                    {isAdmin && (
                      <button type="button" onClick={() => deleteSale(realIndex)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );

  const Reports = () => (
    <>
      <div className="hero-card">
        <div>
          <p className="muted">Sales Overview</p>
          <h1>KSh {totalSales.toLocaleString()}</h1>
          <span className="green-text">
            ▲ Profit: KSh {totalProfit.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="stats-grid two">
        <div className="stat-card teal">
          <p>Cash</p>
          <h2>KSh {cashTotal.toLocaleString()}</h2>
        </div>

        <div className="stat-card pink">
          <p>M-Pesa</p>
          <h2>KSh {mpesaTotal.toLocaleString()}</h2>
        </div>
      </div>

      <div className="panel">
        <h2>Low Stock</h2>

        {lowStockProducts.length === 0 ? (
          <p className="empty">No low stock products</p>
        ) : (
          lowStockProducts.map((p) => (
            <div className="sale-row" key={p.name}>
              <div className="item-icon warning">⚠️</div>

              <div>
                <h3>{p.name}</h3>
                <p>Current stock: {p.stock}</p>
              </div>

              <strong>Reorder</strong>
            </div>
          ))
        )}
      </div>
    </>
  );

  const More = () => (
    <div className="panel">
      <h2>More</h2>

      <div className="form-box">
        <h3>{isAdmin ? "Admin Mode Active" : "Admin Login"}</h3>

        {!isAdmin ? (
          <>
            <input
              type="password"
              placeholder="Enter admin PIN"
              autoComplete="off"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />

            <button className="primary-btn" type="button" onClick={unlockAdmin}>
              Unlock Admin
            </button>
          </>
        ) : (
          <button className="secondary-btn" type="button" onClick={lockAdmin}>
            Lock Admin
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="form-box">
          <h3>Worker Management</h3>

          <input
            placeholder="Worker name"
            autoComplete="off"
            value={newWorker}
            onChange={(e) => setNewWorker(e.target.value)}
          />

          <button className="primary-btn" type="button" onClick={addWorker}>
            Add Worker
          </button>

          <br />
          <br />

          {workers.length === 0 ? (
            <p className="empty">No workers added yet</p>
          ) : (
            workers.map((worker) => (
              <div className="sale-row" key={worker.id}>
                <div className="item-icon">👤</div>

                <div>
                  <h3>{worker.name}</h3>
                  <p>Worker</p>
                </div>

                <div className="sale-actions">
                  <button
                    type="button"
                    onClick={() => deleteWorker(worker.id, worker.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isAdmin && (
        <>
          <button
            className="primary-btn"
            type="button"
            onClick={testSupabaseConnection}
          >
            Test Supabase Connection
          </button>

          <br />
          <br />

          <button
            className="secondary-btn"
            type="button"
            onClick={syncProductsToSupabase}
          >
            Sync Products to Supabase
          </button>

          <br />
          <br />

          <button
            className="secondary-btn"
            type="button"
            onClick={loadProductsFromSupabase}
          >
            Load Products from Supabase
          </button>

          <br />
          <br />

          <button
            className="secondary-btn"
            type="button"
            onClick={loadSalesFromSupabase}
          >
            Load Sales from Supabase
          </button>

          <br />
          <br />

          <button
            className="secondary-btn"
            type="button"
            onClick={loadDataFromSupabase}
          >
            Refresh All Data
          </button>

          <br />
          <br />
        </>
      )}

      <div className="more-card">📦 Real-time Stock — Supabase active</div>
      <div className="more-card">
        👥 Multi-worker Access — {isAdmin ? "Admin" : "Worker"} mode
      </div>
      <div className="more-card">📊 Reports & Analytics — active</div>
      <div className="more-card">🔐 Admin PIN — active</div>
    </div>
  );

  return (
    <div className="phone-shell">
      <div className="top-bar">
        <button className="menu-btn" type="button">
          ☰
        </button>

        <h2>
          {activeTab === "dashboard" && SHOP_NAME}
          {activeTab === "products" && "Products"}
          {activeTab === "sales" && "New Sale"}
          {activeTab === "reports" && "Reports"}
          {activeTab === "more" && "More"}
        </h2>

        <span className="bell">🔔</span>
      </div>

      <main className="screen">
        {activeTab === "dashboard" && Dashboard()}
        {activeTab === "products" && Products()}
        {activeTab === "sales" && Sales()}
        {activeTab === "reports" && Reports()}
        {activeTab === "more" && More()}
      </main>

      <nav className="bottom-nav">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("dashboard")}
        >
          ⌂<span>Dashboard</span>
        </button>

        <button
          className={activeTab === "products" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("products")}
        >
          ▣<span>Products</span>
        </button>

        <button
          className="big-add"
          type="button"
          onClick={() => setActiveTab("sales")}
        >
          +
        </button>

        <button
          className={activeTab === "reports" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("reports")}
        >
          ◴<span>Reports</span>
        </button>

        <button
          className={activeTab === "more" ? "active" : ""}
          type="button"
          onClick={() => setActiveTab("more")}
        >
          ☰<span>More</span>
        </button>
      </nav>
    </div>
  );
}

export default App;