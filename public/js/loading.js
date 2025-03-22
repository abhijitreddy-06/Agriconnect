// Show the loading overlay
function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

// Hide the loading overlay
function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

// Example: Axios interceptor (if you use axios for API calls)
if (window.axios) {
  axios.interceptors.request.use(
    (config) => {
      showLoading();
      return config;
    },
    (error) => {
      hideLoading();
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      hideLoading();
      return response;
    },
    (error) => {
      hideLoading();
      return Promise.reject(error);
    }
  );
}
