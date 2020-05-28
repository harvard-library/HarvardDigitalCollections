class ListsController < ApplicationController  
    include Blacklight::SearchContext
    include Blacklight::SearchHelper
    include Blacklight::TokenBasedUser
	include Harvard::LibraryCloud::Collections
	before_action :authenticate_user!
	skip_before_action :verify_authenticity_token, only: [:add_items_form]

    def index
		@lists = available_collections()
    end

	def show
	  @id = params[:id]
	  
	  begin 
		@list = get_collection_by_id(@id)
	  rescue JSON::ParserError
		@list = nil
	  end

	  if @list.nil?
		redirect_to '/lists'
	  end
	  
	  search_params = {}
	  search_params[:setSpec] = @list['setSpec']

	  if !params[:page].nil? && !params[:page].to_s != ''
		page_number = params[:page].to_i
		
		if page_number > 0
			search_params[:page] = params[:page]
		end
	  end

	  (@response, @document_list) = search_results(search_params)
	end 
		
	def edit
	  @id = params[:id]
	  @list = get_collection_by_id(@id)
	  rescue JSON::ParserError
		@list = nil
	  		
	  if @list.nil?
		redirect_to '/lists'
	  end
	end

	def create
		@title = params[:title]

		#render plain: "create list=" + @title
		@lc_user_api_key = create_library_cloud_user
        render json: @lc_user_api_key
	end

	def update
		@id = params[:id]
		@title = params[:title]

		render plain: "ID=" + @id + " title=" + @title
	end

	def destroy
		@id = params[:id]
	
		render plain: "DELETE ID=" + @id
	end

	def add_items_form
		if params[:item_ids].to_s == ""
			redirect_to '/lists'
			return
		end
		@item_ids = params[:item_ids]
		@items = @item_ids.split(',')
		@thumbnail = ''
		@default_list_id = ''

		if @items.length == 1
			#adding one item to list, lookup item
			@response, @single_item = fetch(@items[0])
		else
			#adding multiple items
			@response, @items_found = fetch(@items)
		end

		if @response[:items].nil?
			redirect_to '/lists'
			return
		end
		
		if !@single_item.nil?
			@item_count = 1
			@thumbnail = @single_item[:preview]
		else
			@item_count = @response[:pagination][:numFound]
			backup_thumbnail = ''
			first_item_found = false
			#items found aren't in the order we want, find the first item for the thumb
			@items_found.each do |item|
				puts 'checking=' + item[:identifier] + '==' + @items[0]
				if item[:identifier] == @items[0]
					puts 'thumb=' + item[:preview].to_s
					first_item_found = true
					if item[:preview].to_s != ""
						@thumbnail = item[:preview]		
						break
					elsif backup_thumbnail != ""
						break
					end
					
				elsif backup_thumbnail == "" && item[:preview].to_s != ""
					backup_thumbnail = item[:preview]
					if first_item_found 
						break
					end
				end
			end
			
			#if thumb is still empty use the first non-empty one
			if @thumbnail == ""
				@thumbnail = backup_thumbnail
			end
		end

		@lists = available_collections()
		if !@lists.nil? && @lists.length > 0
		  @default_list_id = @lists[0]['id']
		end
		render layout: false
	end

	def add_items
	  @item_ids = params[:item_ids]
	  @list = params[:list]
	  @lists = available_collections()

	  list_found = false
	  @lists.each do |x|
		if x[:id] == @list
			list_found = true
			break
		end
	  end

	  if !list_found
	  	redirect_to '/lists'
		return
	  end

	  render plain: "item_ids=" + @item_ids + " list=" + @list
	end
end
