use keyring::Entry;
use secrecy::SecretString;

pub struct SecretManager {
    service_name: String,
}

impl SecretManager {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
        }
    }

    pub fn save_secret(&self, account: &str, secret: SecretString) -> Result<(), String> {
        let entry = Entry::new(&self.service_name, account)
            .map_err(|e| format!("Keyring init error: {}", e))?;
        
        use secrecy::ExposeSecret;
        entry
            .set_password(secret.expose_secret())
            .map_err(|e| format!("Failed to store credential: {}", e))
    }

    pub fn has_secret(&self, account: &str) -> bool {
        let entry = Entry::new(&self.service_name, account);
        if let Ok(e) = entry {
            e.get_password().is_ok()
        } else {
            false
        }
    }

    pub fn delete_secret(&self, account: &str) -> Result<(), String> {
        let entry = Entry::new(&self.service_name, account)
            .map_err(|e| format!("Keyring init error: {}", e))?;
        entry
            .delete_password()
            .map_err(|e| format!("Failed to delete credential: {}", e))
    }
}
