class ImagesController < ApplicationController
  def upload
    base64 = params[:base64]
    old_avatar = params[:old_avatar]

    if base64.blank?
      return render json: { error: 'base64 requires', status: :bad_request }
    end

    result = CloudinaryService.upload_avatar(base64, old_avatar)

    render json: { url: result }, status: ok

  rescue => err
    render json: { error: err.message }
  end
  
  def delete
    url = params[:url]

    if url.blank?
      return render json: { error: 'url required' }, status: :bad_request
    end

    CloudinaryService.delete_avatar(url)
    head :no_content
  
  rescue => err
    render json: { error: err.message }, status: :internal_server_error

  end

end