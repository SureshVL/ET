import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getShiprocketToken } from "../_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { orderId, shippingAddress, items, customerName, phone, addressLine, city, state, pincode, totalAmount } = req.body;

    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      res.json({
        success: true,
        trackingId: "SR" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        labelUrl: "",
        courierPartner: "Delhivery",
        shiprocketOrderId: null,
        shiprocketShipmentId: null,
        mock: true,
      });
      return;
    }

    const token = await getShiprocketToken();
    const orderIdShort = orderId.slice(-8).toUpperCase();

    const orderPayload = {
      order_id: `DEV-${orderIdShort}`,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: "Primary",
      channel_id: "",
      comment: "Devaragudi Ethnic Threads - Haridwar",
      billing_customer_name: customerName || "Customer",
      billing_last_name: "",
      billing_address: addressLine || shippingAddress?.split("\n")[1] || "",
      billing_address_2: "",
      billing_city: city || "Hyderabad",
      billing_pincode: pincode || "500001",
      billing_state: state || "Telangana",
      billing_country: "India",
      billing_email: "",
      billing_phone: phone || "9999999999",
      shipping_is_billing: true,
      order_items: items.map((item: any) => ({
        name: `${item.name} (Size: ${item.size})`,
        sku: `${item.productId}-${item.size}`,
        units: item.quantity,
        selling_price: item.price,
        discount: 0,
        tax: 0,
        hsn: 62069000,
      })),
      payment_method: "Prepaid",
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: totalAmount || items.reduce((a: number, i: any) => a + i.price * i.quantity, 0),
      length: 30,
      breadth: 25,
      height: 5,
      weight: Math.max(0.5, items.reduce((a: number, i: any) => a + i.quantity * 0.5, 0)),
    };

    const orderRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.shipment_id) {
      res.status(500).json({ success: false, error: orderData.message || "Failed to create Shiprocket order" });
      return;
    }

    const shipmentId = orderData.shipment_id;
    const srOrderId = orderData.order_id;

    // AWB
    const awbRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });
    const awbData = await awbRes.json();
    const awbCode = awbData?.response?.data?.awb_code || awbData?.awb_code || "";
    const courierName = awbData?.response?.data?.courier_name || "Delhivery";

    // Pickup
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);
    await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shipment_id: [shipmentId], pickup_date: [pickupDate.toISOString().split("T")[0]] }),
    });

    // Label
    const labelRes = await fetch("https://apiv2.shiprocket.in/v1/external/courier/generate/label", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });
    const labelData = await labelRes.json();

    res.json({
      success: true,
      trackingId: awbCode || `SR-${orderIdShort}`,
      labelUrl: labelData?.label_url || "",
      courierPartner: courierName,
      shiprocketOrderId: srOrderId,
      shiprocketShipmentId: shipmentId,
      mock: false,
    });
  } catch (err: any) {
    console.error("Shipping create error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
