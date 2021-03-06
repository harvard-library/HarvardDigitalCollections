module Harvard::LibraryCloud

  require 'faraday'
  require 'json'

  class API

    def initialize
      case ENV["LC_ENV"]
      when 'development'
        @base_uri = 'https://api-dev.lib.harvard.edu/v2/'
      when 'qa'
        @base_uri = 'https://api-qa.lib.harvard.edu/v2/'
      when 'production'
        @base_uri = 'https://api.lib.harvard.edu/v2/'
      else
        @base_uri = 'https://api.lib.harvard.edu/v2/'
      end
    end

    def get_base_uri
      @base_uri
    end

    def send_and_receive path, opts
      connection = build_request path, opts
      execute connection
    end

    # +build_request+ accepts a path and options hash,
    # then prepares a normalized hash to return for sending
    # to a solr connection driver.
    # +build_request+ sets up the uri/query string
    # and converts the +data+ arg to form-urlencoded,
    # if the +data+ arg is a hash.
    # returns a hash with the following keys:
    #   :method
    #   :params
    #   :headers
    #   :data
    #   :uri
    #   :path
    #   :query
    def build_request path, opts
      raise "path must be a string or symbol, not #{path.inspect}" unless [String,Symbol].include?(path.class)
      path = path.to_s
      opts[:method] ||= :get
      raise "The :data option can only be used if :method => :post" if opts[:method] != :post and opts[:data]

      if !opts[:params].nil? && opts[:params][:preserve_original]
        params = opts[:params]
      else
        params = params_to_lc(opts[:params]) unless opts[:params].nil? || opts[:params].empty?
      end

      Faraday.new(:url => @base_uri + path) do |faraday|
        faraday.request  :url_encoded
        faraday.response :logger
        faraday.adapter Faraday.default_adapter
        faraday.params = params ||= {}
      end
    end

    def execute connection
      raw_response = begin
        response = connection.get
        { status: response.status.to_i, headers: response.headers, body: response.body.force_encoding('utf-8') }
      rescue Errno::ECONNREFUSED, Faraday::Error::ConnectionFailed
        raise RSolr::Error::ConnectionRefused, connection.inspect
      rescue Faraday::Error => e
        raise RSolr::Error::Http.new(connection, e.response)
      end
      # We are assuming the response is JSON
      adapt_response(connection, raw_response) unless raw_response.nil?
    end

    def params_to_lc params
      results = {}
      # Restrict all results
      results[:inDRS] = 'true'
      results[:accessFlag] = 'P'
      # Don't support sort parameters for now
      # results[:sort] = sort_params_to_lc(params[:sort]) if params[:sort]
      
      all_fields_search = false

      #most searches will be on all fields
      if params[:search_field] == 'all_fields'
        all_fields_search = true
      else
        if params[:q]
          #check if this is a recordIdentifier request
          m = /\{\!lucene\}identifier:(.*)$/.match(params[:q])
          if m
            results[:recordIdentifier] = m[1].gsub('"', '') 
          elsif params[:search_field].nil?
            #if no search_field, default to all fields
            all_fields_search = true    
          else
            results[params[:search_field]] = params[:q]
          end 
        end
      end

      if all_fields_search
        search_term = params[:q].to_s

        #escape special characters in search_term for LC API
        special_chars = Regexp.escape('~!^()-[]{}\"/')
        search_term = search_term.gsub(/[#{special_chars}]+/){|match| puts "\\" + match}
        #these double characters cause issues (2 spaces, &&, ||)
        search_term = search_term.gsub(/ +/, " ").gsub(/&+/, "&").gsub(/\|+/, "|")
        
        results[:q] = search_term if search_term && search_term.length > 0
      end
      
      #add date start/end params
      if params['range'] && params['range']['originDate']
        startYear = -10000
        if params['range']['originDate']['begin'] && params['range']['originDate']['begin'].to_s != ''  
          begin
            if Integer(params['range']['originDate']['begin']) 
              results['dates.start'] = params['range']['originDate']['begin']  
              startYear = Integer(params['range']['originDate']['begin']) 
            end
          rescue
          end
        end
        if params['range']['originDate']['end'] && params['range']['originDate']['end'].to_s != ''
          begin
            if Integer(params['range']['originDate']['end']) 
              endYear = Integer(params['range']['originDate']['end']) 
              if endYear >= startYear
                results['dates.end'] = params['range']['originDate']['end']
              end
            end
          rescue
          end
        end
      end

      results[:start] = params[:start] if params[:start]
      results[:limit] = params[:rows] if params[:rows]
      results[:facets] = facet_params_to_lc(params['facet.field']) if params['facet.field']
      results[:recordIdentifier] = params['recordIdentifier'] if params['recordIdentifier']
	  results[:setSpec] = params[:setSpec] if params[:setSpec]
      results.merge!(facet_query_params_to_lc(params[:fq])) if params[:fq]
      results
    end

    def facet_params_to_lc facet_field
	    if facet_field.kind_of?(Array)
		    facet_field.map do |x|
			  # "{!ex=genre_single}genre"
			  m = facet_param_formatted(x)
		    end.join(',')
	    else
		    facet_param_formatted(facet_field)
	    end 
    end

    #parse field name from Blacklight formatted field name
	  def facet_param_formatted facet_field  
      m = /\{.*\}(\S+)$/.match(facet_field)
      if m
		    m[1] 
      else
        facet_field
      end
	  end

    def facet_query_params_to_lc fq
      results = {}
      fq.each do |x|
        #parse facet name and vaule from QS param
        m = /\{!term f=(\S*).*\}(.*)$/.match(x)
        
        #only use _exact params for certain facets due to bug in LC API
        if m[1] == 'subject' || m[1] == 'originPlace' || m[1] == 'seriesTitle'
          results[m[1]] = m[2]
        else
          results[m[1] + '_exact'] = m[2]
        end
      end if fq
      results
    end

    def sort_params_to_lc sort
      sort
    end

    def adapt_response connection, raw_response
      JSON.parse raw_response[:body]
    end


  end

end
