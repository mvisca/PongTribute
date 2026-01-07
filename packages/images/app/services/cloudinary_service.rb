class CloudinaryService
  ALLOWED_MIMES = %w[image/png image/jpg image/jpeg image/webp].freeze
  MAX_SIZE_MB = 10
  
  class << self
    def upload_avatar(base64, old_avatar = nil)
      validate_base64!(base64)
      
      result = Cloudinary::Uploader.upload(
        base64,
        folder: 'transcendence',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill' },
          { quality: 'auto' },
          { gravity: 'auto' },
          { fetch_format: 'auto' } 
        ],
        allowed_formats: ['png', 'jpg', 'jpeg', 'webp']
      )
      
      delete_avatar(old_avatar) if old_avatar.present? && old_avatar != default_avatar
      
      result['secure_url'] 
    rescue Cloudinary::CloudinaryException => err
      raise "Fallo de Cloudinary: #{err.message}"
    end
    
    def delete_avatar(url)
      return unless cloudinary_url?(url)
      
      public_id = extract_public_id(url)
      raise "No se pudo extraer public_id de #{url}" if public_id.blank?
      
      Cloudinary::Uploader.destroy(public_id)
    end
    
    private
    
    def validate_base64!(base64)
      unless base64.match?(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,/)
        raise 'Invalid base64 format'
      end
      
      mime = base64.match(/^data:([^;]+)/)[1]
      raise "Tipo mime inválido: #{mime}" unless ALLOWED_MIMES.include?(mime)
      
      data = base64.split(',')[1]
      size_mb = (data.bytesize * 0.75) / (1024 * 1024)
      raise "Imagen demasiado grande: #{size_mb.round(2)}MB (max #{MAX_SIZE_MB}MB)" if size_mb > MAX_SIZE_MB
    end
    
    def cloudinary_url?(url)
      URI.parse(url).host.include?('cloudinary.com')
    rescue URI::InvalidURIError
      false
    end
    
    def extract_public_id(url)
      uri = URI.parse(url)
      match = uri.path.match(%r{/image/upload/(?:v\d+/)?(.*?)(?:\.[^.]+)?$})
      match ? match[1] : nil
    end
    
    def default_avatar
      ENV['CLOUDINARY_DEFAULT_AVATAR']
    end
  end
end