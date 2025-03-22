document
  .getElementById("sell-product-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const productName = document.getElementById("product-name").value;
    const productDescription = document.getElementById(
      "product-description"
    ).value;
    const productPrice = document.getElementById("product-price").value;
    const productImage = document.getElementById("product-image").files[0];
    const productQuantity = document.getElementById("product-quantity").value;
    const productQuality = document.getElementById("product-quality").value;

    // Handle the form data (e.g., send to server, display a success message)
    console.log("Product Added:", {
      productName,
      productDescription,
      productPrice,
      productImage,
      productQuantity,
      productQuality,
    });

    alert("Product added successfully!");
  });
